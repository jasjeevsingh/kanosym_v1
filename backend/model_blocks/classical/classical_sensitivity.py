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


def run_monte_carlo_volatility(portfolio_state: Dict[str, Any]) -> dict:
    """
    Monte Carlo-based volatility estimator.
    Returns both daily and annualized portfolio volatility.
    """
    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    correlation_matrix = np.array(portfolio_state['correlation_matrix'])
    assert weights.shape == volatility.shape, "Weights and volatility must align"
    assert correlation_matrix.shape == (len(weights), len(weights)), "Correlation matrix must be square"
    num_simulations = 10000
    time_periods = 252
    np.random.seed(42)
    covariance_matrix = np.outer(volatility, volatility) * correlation_matrix
    returns = np.random.multivariate_normal(
        mean=np.zeros(len(weights)),
        cov=covariance_matrix,
        size=(num_simulations, time_periods)
    )
    portfolio_returns = np.sum(returns * weights, axis=1)
    daily_vol = float(np.std(portfolio_returns))
    annualized_vol = daily_vol * np.sqrt(252)
    return {
        'portfolio_volatility_daily': daily_vol,
        'portfolio_volatility_annualized': annualized_vol
    }


def classical_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int
) -> Dict[str, Any]:
    """
    Main function for classical sensitivity testing (portfolio volatility only).
    """
    analytics = AnalyticsCollector('classical')
    analytics.start_collection()
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)
    baseline_metrics = run_monte_carlo_volatility(portfolio)
    baseline_daily = baseline_metrics['portfolio_volatility_daily']
    baseline_annualized = baseline_metrics['portfolio_volatility_annualized']
    results = []
    for p in perturbed_portfolios:
        metrics = run_monte_carlo_volatility(p)
        result = {
            "perturbed_value": p["perturbed_value"],
            "portfolio_volatility_daily": metrics["portfolio_volatility_daily"],
            "portfolio_volatility_annualized": metrics["portfolio_volatility_annualized"]
        }
        results.append(result)
        analytics.add_result(result)
    analytics.end_collection()
    output = format_output(
        perturbation=param,
        asset=asset,
        range_tested=list(np.linspace(range_vals[0], range_vals[1], steps)),
        baseline_portfolio_volatility_daily=baseline_daily,
        baseline_portfolio_volatility_annualized=baseline_annualized,
        results=results,
        analytics=analytics.get_analytics_summary()
    )
    return output


def format_output(perturbation: str, asset: str, range_tested: List[float], baseline_portfolio_volatility_daily: float, baseline_portfolio_volatility_annualized: float, results: List[Dict[str, Any]], analytics: Dict[str, Any] = None) -> Dict[str, Any]:
    output = {
        "perturbation": perturbation,
        "asset": asset,
        "range_tested": range_tested,
        "baseline_portfolio_volatility_daily": baseline_portfolio_volatility_daily,
        "baseline_portfolio_volatility_annualized": baseline_portfolio_volatility_annualized,
        "results": results,
        "processing_mode": "classical",
        "description": "Classical Monte Carlo simulation for portfolio sensitivity analysis (portfolio volatility only)"
    }
    if analytics:
        output["analytics"] = analytics
    return output 
    
