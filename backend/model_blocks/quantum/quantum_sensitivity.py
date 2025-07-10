"""
quantum_sensitivity.py

Quantum Sensitivity Test Block for KANOSYM.
Contains all functions needed for quantum-enhanced portfolio sensitivity analysis.

This block performs sensitivity testing using Quantum Amplitude Estimation (QAE)
to analyze how portfolio performance changes when parameters are perturbed.
"""

import numpy as np
from typing import Dict, Any, List
from qiskit import QuantumCircuit, transpile
from qiskit_aer import Aer
import sys
import os
import threading
import uuid
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from analytics import AnalyticsCollector
from ..noira_utils import send_message_to_noira, format_analysis_summary
import logging
from qiskit.circuit.library import WeightedAdder
from qiskit.algorithms import EstimationProblem
from qiskit.algorithms.amplitude_estimators import IterativeAmplitudeEstimation
from qiskit.utils import QuantumInstance

# Configure logging
logger = logging.getLogger(__name__)


def perturb_portfolio(param: str, asset: str, range_vals: List[float], steps: int, portfolio: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate a list of perturbed portfolios by varying the selected parameter.
    
    Args:
        param: Parameter to perturb ('volatility', 'weight', 'correlation')
        asset: Asset to perturb
        range_vals: [min_value, max_value] for perturbation range
        steps: Number of steps in the range
        portfolio: Original portfolio configuration
        
    Returns:
        List of perturbed portfolio configurations
    """
    perturbed = []
    values = np.linspace(range_vals[0], range_vals[1], steps)
    
    for val in values:
        p = {**portfolio}
        
        if param == 'volatility':
            idx = portfolio['assets'].index(asset)
            p['volatility'] = list(portfolio['volatility'])
            p['volatility'][idx] = val
            
        elif param == 'weight':
            idx = portfolio['assets'].index(asset)
            p['weights'] = list(portfolio['weights'])
            p['weights'][idx] = val
            # Optionally re-normalize weights here
            
        elif param == 'correlation':
            idx = portfolio['assets'].index(asset)
            p['correlation_matrix'] = [row[:] for row in portfolio['correlation_matrix']]
            for j in range(len(p['correlation_matrix'])):
                p['correlation_matrix'][idx][j] = val
                p['correlation_matrix'][j][idx] = val
                
        p['perturbed_value'] = val
        perturbed.append(p)
        
    return perturbed


def run_quantum_volatility(portfolio_state: Dict[str, Any]) -> dict:
    """
    Quantum volatility estimator using Qiskit's Iterative Amplitude Estimation (QAE).
    Supports up to 3 assets. If more than 3 assets, raises a ValueError with a warning.
    """
    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    correlation_matrix = np.array(portfolio_state['correlation_matrix'])
    n_assets = len(weights)
    if n_assets > 3:
        raise ValueError("Quantum volatility estimator currently only supports up to 3 assets due to quantum resource constraints. Please use 3 or fewer assets for quantum analysis.")
    if n_assets < 2:
        raise ValueError("At least 2 assets are required for quantum volatility estimation.")

    # For 2 or 3 assets, compute portfolio variance
    # Variance = w^T * Cov * w
    cov_matrix = np.outer(volatility, volatility) * correlation_matrix
    portfolio_variance = float(weights @ cov_matrix @ weights)

    # Map variance to probability amplitude in [0, 1]
    max_variance = 1.0
    scaled_variance = min(portfolio_variance / max_variance, 1.0)

    from qiskit import QuantumCircuit
    qc = QuantumCircuit(1)
    qc.ry(2 * np.arcsin(np.sqrt(scaled_variance)), 0)

    from qiskit.algorithms import EstimationProblem
    from qiskit.algorithms.amplitude_estimators import IterativeAmplitudeEstimation
    from qiskit.utils import QuantumInstance
    backend = Aer.get_backend('aer_simulator')
    qi = QuantumInstance(backend, shots=1000)
    qae = IterativeAmplitudeEstimation(epsilon_target=0.01, alpha=0.05, quantum_instance=qi)
    problem = EstimationProblem(
        state_preparation=qc,
        objective_qubits=[0],
        grover_operator=None
    )
    result = qae.estimate(problem)
    est_variance = result.estimation
    est_volatility = np.sqrt(est_variance * max_variance)
    annualized_vol = est_volatility * np.sqrt(252)
    return {
        'portfolio_volatility_daily': float(est_volatility),
        'portfolio_volatility_annualized': float(annualized_vol)
    }


def quantum_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int
) -> Dict[str, Any]:
    """
    Main function for quantum sensitivity testing (volatility only, with Noira async and analytics).
    """
    analytics = AnalyticsCollector('quantum')
    analytics.start_collection()
    logger.info(f"Starting quantum sensitivity analysis: {param} for {asset}")

    # 1. Perturb the portfolio
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)

    # 2. Run quantum volatility for baseline (unperturbed)
    baseline_metrics = run_quantum_volatility(portfolio)
    baseline_daily = baseline_metrics['portfolio_volatility_daily']
    baseline_annualized = baseline_metrics['portfolio_volatility_annualized']

    # 3. Run quantum volatility for each perturbed portfolio
    results = []
    for p in perturbed_portfolios:
        metrics = run_quantum_volatility(p)
        # Calculate delta vs baseline
        delta_daily = metrics["portfolio_volatility_daily"] - baseline_daily
        delta_annualized = metrics["portfolio_volatility_annualized"] - baseline_annualized
        
        result = {
            "perturbed_value": p["perturbed_value"],
            "portfolio_volatility_daily": metrics["portfolio_volatility_daily"],
            "portfolio_volatility_annualized": metrics["portfolio_volatility_annualized"],
            "volatility": metrics["portfolio_volatility_daily"],  # Use daily volatility as the main metric
            "delta_vs_baseline": delta_daily  # Use daily volatility delta
        }
        results.append(result)
        analytics.add_result(result)

    # 4. End analytics collection
    analytics.end_collection()

    # 5. Format output with analytics
    output = format_output(
        perturbation=param,
        asset=asset,
        range_tested=list(np.linspace(range_vals[0], range_vals[1], steps)),
        baseline_portfolio_volatility_daily=baseline_daily,
        baseline_portfolio_volatility_annualized=baseline_annualized,
        results=results,
        analytics=analytics.get_analytics_summary()
    )

    # 6. Start Noira processing in background (non-blocking)
    logger.info(f"Quantum analysis complete: {format_analysis_summary(output)}")
    analysis_id = str(uuid.uuid4())
    def process_noira_async():
        try:
            noira_sent, brief_message, llm_response = send_message_to_noira(
                analysis_type="quantum",
                portfolio=portfolio,
                param=param,
                asset=asset,
                range_vals=range_vals,
                steps=steps,
                results=output
            )
            if noira_sent and llm_response:
                from noira.chat_controller import chat_controller
                chat_controller.store_async_response(analysis_id, brief_message, llm_response)
                logger.info(f"Noira response stored for quantum analysis: {analysis_id}")
        except Exception as e:
            logger.error(f"Error processing Noira response: {e}")
    threading.Thread(target=process_noira_async, daemon=True).start()

    # 7. Return results immediately (without waiting for Noira)
    output["noira_notification"] = {
        "processing": True,
        "analysis_id": analysis_id,
        "brief_message": f"Tell me about this quantum sensitivity test for {asset} {param}."
    }
    return output


def format_output(perturbation: str, asset: str, range_tested: List[float], baseline_portfolio_volatility_daily: float, baseline_portfolio_volatility_annualized: float, results: List[Dict[str, Any]], analytics: Dict[str, Any] = None) -> Dict[str, Any]:
    output = {
        "perturbation": perturbation,
        "asset": asset,
        "range_tested": range_tested,
        "baseline_portfolio_volatility_daily": baseline_portfolio_volatility_daily,
        "baseline_portfolio_volatility_annualized": baseline_portfolio_volatility_annualized,
        "results": results,
        "processing_mode": "quantum",
        "description": "Quantum-inspired simulation for portfolio sensitivity analysis (portfolio volatility only)"
    }
    if analytics:
        output["analytics"] = analytics
    return output 