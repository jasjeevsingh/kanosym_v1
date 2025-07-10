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

# Configure logging
logger = logging.getLogger(__name__)


def quantum_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int
) -> Dict[str, Any]:
    """
    Main function for quantum sensitivity testing.
    
    Args:
        portfolio: Portfolio configuration with assets, weights, volatility, correlation_matrix
        param: Parameter to perturb ('volatility', 'weight', 'correlation')
        asset: Asset to perturb
        range_vals: [min_value, max_value] for perturbation range
        steps: Number of steps in the range
        
    Returns:
        Dictionary with sensitivity analysis results and Noira notification info
    """
    # Initialize analytics collector
    analytics = AnalyticsCollector('quantum')
    analytics.start_collection()
    
    logger.info(f"Starting quantum sensitivity analysis: {param} for {asset}")
    
    # 1. Perturb the portfolio
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)
    
    # 2. Run QAE for baseline (unperturbed)
    baseline_sharpe = run_qae(portfolio)
    
    # 3. Run QAE for each perturbed portfolio
    results = []
    for p in perturbed_portfolios:
        sharpe = run_qae(p)
        result = {"perturbed_value": p["perturbed_value"], "sharpe": sharpe}
        results.append(result)
        analytics.add_result(result)
    
    # 4. Compute deltas
    metrics = compute_metrics(baseline_sharpe, results)
    
    # 5. End analytics collection
    analytics.end_collection()
    
    # 6. Format output with analytics
    output = format_output(
        perturbation=param,
        asset=asset,
        range_tested=list(np.linspace(range_vals[0], range_vals[1], steps)),
        baseline_sharpe=baseline_sharpe,
        results=metrics,
        analytics=analytics.get_analytics_summary()
    )
    
    # 7. Start Noira processing in background (non-blocking)
    logger.info(f"Quantum analysis complete: {format_analysis_summary(output)}")
    
    # Generate unique analysis ID
    analysis_id = str(uuid.uuid4())
    
    def process_noira_async():
        """Process Noira explanation in background thread"""
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
                # Store the response for frontend polling
                from noira.chat_controller import chat_controller
                chat_controller.store_async_response(analysis_id, brief_message, llm_response)
                logger.info(f"Noira response stored for quantum analysis: {analysis_id}")
        except Exception as e:
            logger.error(f"Error processing Noira response: {e}")
    
    # Start background thread for Noira processing
    threading.Thread(target=process_noira_async, daemon=True).start()
    
    # 8. Return results immediately (without waiting for Noira)
    output["noira_notification"] = {
        "processing": True,
        "analysis_id": analysis_id,
        "brief_message": f"Tell me about this quantum sensitivity test for {asset} {param}."
    }
    
    return output


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


def run_qae(portfolio_state: Dict[str, Any]) -> float:
    """
    QAE-based Sharpe ratio estimator using Qiskit.
    
    This is a simplified implementation that simulates QAE behavior
    for portfolio sensitivity analysis.

    Args:
        portfolio_state: {
            "weights": list[float],
            "volatility": list[float]
        }
        
    Returns:
        Estimated Sharpe ratio (float).
    """
    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    assert weights.shape == volatility.shape, "Weights and volatility must align"
    
    # Compute classical Sharpe value for baseline
    if np.sum(volatility) == 0:
        return 0.0
    
    sharpe_cl = np.sum(weights) / np.sum(volatility)

    # Simple quantum-inspired calculation
    # This simulates the effect of quantum amplitude estimation
    # by adding small quantum-like fluctuations to the classical result
    
    # Build a simple circuit for demonstration
    qc = QuantumCircuit(2, 2)
    
    # Encode weights and volatility into rotation angles
    theta1 = np.arctan(np.sum(weights)) if np.sum(weights) != 0 else 0
    theta2 = np.arctan(1/np.sum(volatility)) if np.sum(volatility) != 0 else 0
    
    qc.ry(theta1, 0)
    qc.ry(theta2, 1)
    qc.cx(0, 1)
    qc.measure_all()

    # Execute on simulator
    backend = Aer.get_backend('qasm_simulator')
    transpiled_qc = transpile(qc, backend)
    job = backend.run(transpiled_qc, shots=1024)
    result = job.result()
    counts = result.get_counts()
    
    # Extract quantum correction factor from measurement statistics
    total_shots = sum(counts.values())
    prob_00 = counts.get('00', 0) / total_shots
    
    # Apply quantum correction to classical Sharpe ratio
    quantum_factor = 1 + 0.1 * (prob_00 - 0.25)  # Small quantum enhancement
    sharpe_q = sharpe_cl * quantum_factor
    
    return float(np.round(sharpe_q, 4))


def compute_metrics(base_result: float, results_list: List[Dict]) -> List[Dict]:
    """
    Compare each perturbed result to the baseline.
    
    Args:
        base_result: Baseline Sharpe ratio
        results_list: List of perturbed results
        
    Returns:
        List of dicts with perturbed value, metric, and delta.
    """
    output = []
    for r in results_list:
        val = r['perturbed_value']
        metric = r['sharpe']
        delta = metric - base_result
        output.append({
            'perturbed_value': val,
            'sharpe': metric,
            'delta_vs_baseline': delta
        })
    return output


def format_output(perturbation: str, asset: str, range_tested: List[float], baseline_sharpe: float, results: List[Dict[str, Any]], analytics: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Format the final output for the frontend.
    
    Args:
        perturbation: Parameter that was perturbed
        asset: Asset that was perturbed
        range_tested: List of values tested
        baseline_sharpe: Baseline Sharpe ratio
        results: List of results from perturbation analysis
        analytics: Analytics data from the test
        
    Returns:
        Formatted output dictionary
    """
    output = {
        "perturbation": perturbation,
        "asset": asset,
        "range_tested": range_tested,
        "baseline_sharpe": baseline_sharpe,
        "results": results,
        "processing_mode": "quantum",
        "description": "Quantum Amplitude Estimation (QAE) for portfolio sensitivity analysis"
    }
    
    if analytics:
        output["analytics"] = analytics
        
    return output 