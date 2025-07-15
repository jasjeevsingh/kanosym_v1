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
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from analytics import AnalyticsCollector
import logging
from qiskit.circuit.library import WeightedAdder
from qiskit.algorithms import EstimationProblem
from qiskit.algorithms.amplitude_estimators import IterativeAmplitudeEstimation
from qiskit.utils import QuantumInstance
from qiskit.providers.fake_provider import FakeToronto
from qiskit_aer.noise import NoiseModel
from qiskit.quantum_info import Statevector, Operator

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


def run_quantum_volatility(portfolio_state: Dict[str, Any], use_noise_model: bool = False, noise_model_type: str = 'fast') -> dict:
    """
    Quantum volatility estimator using quantum expectation value of the true portfolio variance operator.
    Uses Qiskit's Statevector and Operator for simulation (up to 5 assets).
    Args:
        portfolio_state: Dict describing the portfolio (weights, volatilities, correlation matrix)
        use_noise_model: Ignored in this implementation (no noise simulation for statevector method)
        noise_model_type: Ignored
    Returns:
        Dict with daily and annualized portfolio volatility
    """
    import numpy as np
    from qiskit.quantum_info import Statevector, Operator
    
    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    correlation_matrix = np.array(portfolio_state['correlation_matrix'])
    n_assets = len(weights)

    if n_assets > 5:
        raise ValueError("Quantum volatility estimator supports up to 5 assets.")
    if n_assets < 2:
        raise ValueError("At least 2 assets are required.")

    # 1. Prepare uniform superposition state over all 2^n_assets basis states
    dim = 2 ** n_assets
    psi = np.ones(dim) / np.sqrt(dim)
    state = Statevector(psi)

    # 2. For each basis state, compute the portfolio return
    # Each basis state is a bitstring of length n_assets (e.g., '101')
    # We'll interpret '1' as asset up (return = +volatility), '0' as down (return = -volatility)
    returns = []
    for i in range(dim):
        bits = np.array(list(np.binary_repr(i, width=n_assets))).astype(int)
        # Map 0 -> -1, 1 -> +1
        directions = 2 * bits - 1
        asset_returns = directions * volatility
        # Portfolio return: w^T r
        port_return = np.dot(weights, asset_returns)
        returns.append(port_return)
    returns = np.array(returns)

    # 3. Compute the portfolio variance for each basis state (centered)
    mean_return = np.mean(returns)
    centered_returns = returns - mean_return
    squared_returns = centered_returns ** 2

    # 4. Build diagonal operator with squared returns
    variance_op = np.diag(squared_returns)
    op = Operator(variance_op)

    # 5. Compute expectation value (quantum expectation of variance operator)
    exp_val = np.real(state.expectation_value(op))
    daily_vol = np.sqrt(exp_val)
    annualized_vol = daily_vol * np.sqrt(252)

    return {
        'portfolio_volatility_daily': float(daily_vol),
        'portfolio_volatility_annualized': float(annualized_vol),
        'quantum_expectation_value': float(exp_val),
        'n_assets': n_assets,
        'noise_simulated': False
    }


def quantum_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int,
    use_noise_model: bool = False,
    noise_model_type: str = 'fast'
) -> Dict[str, Any]:
    """
    Main function for quantum sensitivity testing (volatility only).
    """
    analytics = AnalyticsCollector('quantum')
    analytics.start_collection()
    logger.info(f"Starting quantum sensitivity analysis: {param} for {asset}")

    # 1. Perturb the portfolio
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)

    # 2. Run quantum volatility for baseline (unperturbed)
    baseline_metrics = run_quantum_volatility(portfolio, use_noise_model, noise_model_type)
    baseline_daily = baseline_metrics['portfolio_volatility_daily']
    baseline_annualized = baseline_metrics['portfolio_volatility_annualized']

    # 3. Run quantum volatility for each perturbed portfolio
    results = []
    for p in perturbed_portfolios:
        metrics = run_quantum_volatility(p, use_noise_model, noise_model_type)
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

    logger.info(f"Quantum analysis complete")
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