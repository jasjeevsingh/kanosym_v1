"""
hybrid_sensitivity.py

Hybrid Sensitivity Test Block for KANOSYM.
Contains all functions needed for hybrid classical-quantum portfolio sensitivity analysis.

This block performs sensitivity testing using a combination of classical Monte Carlo
simulation with quantum-inspired enhancements for improved accuracy.
"""

import numpy as np
from typing import Dict, Any, List
import random
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


def hybrid_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int
) -> Dict[str, Any]:
    """
    Main function for hybrid sensitivity testing.
    
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
    analytics = AnalyticsCollector('hybrid')
    analytics.start_collection()
        
    
    logger.info(f"Starting hybrid sensitivity analysis: {param} for {asset}")
    
    # 1. Perturb the portfolio
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)
    
    # 2. Run hybrid analysis for baseline (unperturbed)
    baseline_sharpe = run_hybrid_analysis(portfolio)
    
    # 3. Run hybrid analysis for each perturbed portfolio
    results = []
    for p in perturbed_portfolios:
        sharpe = run_hybrid_analysis(p)
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
    logger.info(f"Hybrid analysis complete: {format_analysis_summary(output)}")
    
    # Generate unique analysis ID
    analysis_id = str(uuid.uuid4())
    
    def process_noira_async():
        """Process Noira explanation in background thread"""
        try:
            noira_sent, brief_message, llm_response = send_message_to_noira(
                analysis_type="hybrid",
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
                logger.info(f"Noira response stored for hybrid analysis: {analysis_id}")
        except Exception as e:
            logger.error(f"Error processing Noira response: {e}")
    
    # Start background thread for Noira processing
    threading.Thread(target=process_noira_async, daemon=True).start()
    
    # 8. Return results immediately (without waiting for Noira)
    output["noira_notification"] = {
        "processing": True,
        "analysis_id": analysis_id,
        "brief_message": f"Tell me about this hybrid sensitivity test for {asset} {param}."
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


def run_hybrid_volatility(portfolio_state: Dict[str, Any]) -> dict:
    """
    Hybrid volatility estimator (mocked for now).
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


def hybrid_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int
) -> Dict[str, Any]:
    """
    Main function for hybrid sensitivity testing (portfolio volatility only).
    """
    analytics = AnalyticsCollector('hybrid')
    analytics.start_collection()
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)
    baseline_metrics = run_hybrid_volatility(portfolio)
    baseline_daily = baseline_metrics['portfolio_volatility_daily']
    baseline_annualized = baseline_metrics['portfolio_volatility_annualized']
    results = []
    for p in perturbed_portfolios:
        metrics = run_hybrid_volatility(p)
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
        "processing_mode": "hybrid",
        "description": "Hybrid simulation for portfolio sensitivity analysis (portfolio volatility only)"
    }
    if analytics:
        output["analytics"] = analytics
    return output 

