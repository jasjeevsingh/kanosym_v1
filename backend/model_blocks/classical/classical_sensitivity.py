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
    Now standardized to return volatility metrics (not Sharpe), matching hybrid/quantum.
    """
    # Initialize analytics collector
    analytics = AnalyticsCollector('classical')
    analytics.start_collection()
    
    logger.info(f"Starting classical sensitivity analysis: {param} for {asset}")
    
    # 1. Perturb the portfolio
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)
    
    # 2. Run Monte Carlo volatility for baseline (unperturbed)
    baseline_vols = run_monte_carlo_volatility(portfolio)
    baseline_daily = baseline_vols['portfolio_volatility_daily']
    baseline_annualized = baseline_vols['portfolio_volatility_annualized']
    
    # 3. Run Monte Carlo volatility for each perturbed portfolio
    results = []
    for p in perturbed_portfolios:
        vol_dict = run_monte_carlo_volatility(p)
        result = {
            "perturbed_value": p["perturbed_value"],
            "portfolio_volatility_daily": vol_dict['portfolio_volatility_daily'],
            "portfolio_volatility_annualized": vol_dict['portfolio_volatility_annualized'],
            "volatility": vol_dict['portfolio_volatility_daily'],
            "delta_vs_baseline": vol_dict['portfolio_volatility_daily'] - baseline_daily
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
    
    # Add note about skipped perturbation values if applicable
    if param == 'correlation' and len(results) < steps:
        skipped_count = steps - len(results)
        output["note"] = f"Note: {skipped_count} perturbation value(s) were skipped because they would create invalid correlation matrices. This is normal behavior for large correlation deltas."
    
    logger.info(f"Classical analysis complete")
    
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
                if idx != j:  # Dont change diagonal (always 1)
                    # Shift existing correlation by the perturbation value (delta)
                    original_corr = portfolio['correlation_matrix'][idx][j]
                    new_corr = original_corr + val  # val is now a "shift" amount
                    new_corr = max(-1, min(1, new_corr))  # Clamp to [-1, 1]
                    p['correlation_matrix'][idx][j] = new_corr
                    p['correlation_matrix'][j][idx] = new_corr
            
            # Validate that the perturbed correlation matrix is still positive semi-definite
            try:
                corr_matrix = np.array(p['correlation_matrix'])
                eigenvalues = np.linalg.eigvals(corr_matrix)
                min_eigenvalue = np.min(eigenvalues.real)
                if min_eigenvalue < -0.01:  # Allow small numerical errors
                    logger.warning(f"Correlation matrix becomes invalid with delta {val:.4f} (min eigenvalue: {min_eigenvalue:.4f})")
                    # Skip this perturbation value
                    continue
            except Exception as e:
                logger.warning(f"Could not validate correlation matrix with delta {val:.4f}: {str(e)}")
                # Skip this perturbation value
                continue
                
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


def run_monte_carlo(portfolio_state: Dict[str, Any]) -> float:
    """
    Run Monte Carlo simulation (mocked for now).
    Returns estimated Sharpe ratio using Monte Carlo.
    """
    # Placeholder for Monte Carlo implementation
    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    correlation_matrix = np.array(portfolio_state['correlation_matrix'])
    
    # Mock Monte Carlo result (simplified)
    portfolio_vol = np.sqrt(weights @ (correlation_matrix * np.outer(volatility, volatility)) @ weights)
    portfolio_return = np.sum(weights * 0.1)  # Assuming 10% expected return
    sharpe = portfolio_return / portfolio_vol
    
    return float(sharpe)


def compute_metrics(*args, **kwargs):
    # No longer needed for volatility-based output, but kept for compatibility
    return []


def format_output(perturbation: str, asset: str, range_tested: list, 
                  baseline_portfolio_volatility_daily: float, baseline_portfolio_volatility_annualized: float, 
                  results: list, analytics: dict = None) -> dict:
    """
    Format output for API response (standardized for volatility-based metrics).
    """
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
    
