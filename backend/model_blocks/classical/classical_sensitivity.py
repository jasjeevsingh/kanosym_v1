"""
classical_sensitivity.py

Classical Sensitivity Test Block for KANOSYM.
Contains all functions needed for classical Monte Carlo portfolio sensitivity analysis.

This block performs sensitivity testing using traditional Monte Carlo simulation
to analyze how portfolio performance changes when parameters are perturbed.
"""

import numpy as np
from typing import Dict, Any, List
import random
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from analytics import AnalyticsCollector
from ..noira_utils import send_message_to_noira, format_analysis_summary
import logging

# Configure logging
logger = logging.getLogger(__name__)


def classical_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int
) -> Dict[str, Any]:
    """
    Main function for classical sensitivity testing.
    
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
    analytics = AnalyticsCollector('classical')
    analytics.start_collection()
        
    logger.info(f"Starting classical sensitivity analysis: {param} for {asset}")
    
    # 1. Perturb the portfolio
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)
    
    # 2. Run Monte Carlo for baseline (unperturbed)
    baseline_sharpe = run_monte_carlo(portfolio)
    
    # 3. Run Monte Carlo for each perturbed portfolio
    results = []
    for p in perturbed_portfolios:
        sharpe = run_monte_carlo(p)
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
    
    # 6. Send explanation request to Noira and get notification info
    logger.info(f"Classical analysis complete: {format_analysis_summary(output)}")
    noira_sent, brief_message = send_message_to_noira(
        analysis_type="classical",
        portfolio=portfolio,
        param=param,
        asset=asset,
        range_vals=range_vals,
        steps=steps,
        results=output
    )
    
    # 7. Add Noira notification info to output
    output["noira_notification"] = {
        "sent": noira_sent,
        "brief_message": brief_message
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


def run_monte_carlo(portfolio_state: Dict[str, Any]) -> float:
    """
    Monte Carlo-based Sharpe ratio estimator.
    
    This simulates portfolio performance using traditional Monte Carlo methods
    for portfolio sensitivity analysis.

    Args:
        portfolio_state: {
            "weights": list[float],
            "volatility": list[float],
            "correlation_matrix": list[list[float]]
        }
        
    Returns:
        Estimated Sharpe ratio (float).
    """
    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    correlation_matrix = np.array(portfolio_state['correlation_matrix'])
    
    assert weights.shape == volatility.shape, "Weights and volatility must align"
    assert correlation_matrix.shape == (len(weights), len(weights)), "Correlation matrix must be square"
    
    # Monte Carlo simulation parameters
    num_simulations = 10000
    time_periods = 252  # One trading year
    
    # Generate correlated random returns
    np.random.seed(42)  # For reproducibility
    
    # Create covariance matrix from correlation and volatility
    covariance_matrix = np.outer(volatility, volatility) * correlation_matrix
    
    # Generate multivariate normal returns
    returns = np.random.multivariate_normal(
        mean=np.zeros(len(weights)),  # Assuming zero mean returns
        cov=covariance_matrix,
        size=(num_simulations, time_periods)
    )
    
    # Calculate portfolio returns
    portfolio_returns = np.sum(returns * weights, axis=1)
    
    # Calculate Sharpe ratio (assuming risk-free rate = 0)
    mean_return = np.mean(portfolio_returns)
    std_return = np.std(portfolio_returns)
    print(f"[DEBUG] mean_return: {mean_return}, std_return: {std_return}")
    
    if std_return == 0:
        print("[DEBUG] std_return is zero, returning Sharpe ratio 0.0")
        return 0.0
    
    sharpe_ratio = mean_return / std_return
    print(f"[DEBUG] Sharpe ratio: {sharpe_ratio}")
    
    return float(np.round(sharpe_ratio, 4))


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
        "processing_mode": "classical",
        "description": "Classical Monte Carlo simulation for portfolio sensitivity analysis"
    }
    
    if analytics:
        output["analytics"] = analytics
        
    return output 
    
