"""
hybrid_sensitivity.py

Hybrid Sensitivity Test Block for KANOSYM.
Contains all functions needed for hybrid quantum-classical portfolio sensitivity analysis.

This block combines quantum and classical Monte Carlo simulations to analyze how portfolio performance changes when parameters are perturbed.
It uses Sobol sequences for efficient sampling and quantum-enhanced calibration for improved accuracy.
"""

import numpy as np
from typing import Dict, Any, List
from scipy.stats import qmc
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, ConstantKernel as C
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from analytics import AnalyticsCollector
from model_blocks.quantum.quantum_sensitivity import run_quantum_volatility
import logging

logger = logging.getLogger(__name__)


def run_hybrid_volatility(
    portfolio_state: Dict[str, Any],
    num_simulations: int = 1000,
    time_periods: int = 252
) -> dict:
    """
    Estimate portfolio volatility using Sobol sequences for efficient sampling and quantum-enhanced calibration.

    Args:
        portfolio_state (Dict[str, Any]): Portfolio state containing 'weights', 'volatility', and 'correlation_matrix'.
        num_simulations (int, optional): Number of Monte Carlo simulations. Defaults to 1000.
        time_periods (int, optional): Number of time periods (e.g., trading days). Defaults to 252.

    Returns:
        dict: Dictionary with daily and annualized portfolio volatility.
    """
    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    correlation_matrix = np.array(portfolio_state['correlation_matrix'])
    assert weights.shape == volatility.shape
    assert correlation_matrix.shape == (len(weights), len(weights))

    n_assets = len(weights)

    # Covariance matrix
    cov = np.outer(volatility, volatility) * correlation_matrix

    # Sobol-based multivariate normal sampling
    sampler = qmc.Sobol(d=n_assets * time_periods, scramble=True)
    sobol_samples = sampler.random(num_simulations)
    normal_samples = np.reshape(sobol_samples, (num_simulations, time_periods, n_assets))
    normal_samples = np.array([qmc.scale(x, -1, 1) for x in normal_samples])

    # Apply Cholesky decomposition
    L = np.linalg.cholesky(cov)
    correlated = np.matmul(normal_samples, L.T)
    portfolio_returns = np.sum(correlated * weights, axis=2)
    daily_vol = float(np.std(portfolio_returns))
    annualized_vol = daily_vol * np.sqrt(252)

    return {
        'portfolio_volatility_daily': daily_vol,
        'portfolio_volatility_annualized': annualized_vol
    }


def perturb_portfolio(
    param: str,
    asset: str,
    range_vals: List[float],
    steps: int,
    portfolio: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Generate a list of perturbed portfolio states by varying a single parameter for a given asset.

    Args:
        param (str): Parameter to perturb ('volatility', 'weight', or 'correlation').
        asset (str): Asset to perturb.
        range_vals (List[float]): Range [min, max] for the parameter.
        steps (int): Number of steps in the perturbation.
        portfolio (Dict[str, Any]): Original portfolio state.

    Returns:
        List[Dict[str, Any]]: List of perturbed portfolio states.
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


def hybrid_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int,
    num_simulations: int = 1000,
    time_periods: int = 252
) -> Dict[str, Any]:
    """
    Main hybrid sensitivity engine with selective quantum calibration and interpolation.

    Args:
        portfolio (Dict[str, Any]): Portfolio state.
        param (str): Parameter to perturb ('volatility', 'weight', or 'correlation').
        asset (str): Asset to perturb.
        range_vals (list): Range [min, max] for the parameter.
        steps (int): Number of steps in the perturbation.
        num_simulations (int, optional): Number of Monte Carlo simulations. Defaults to 1000.
        time_periods (int, optional): Number of time periods (e.g., trading days). Defaults to 252.

    Returns:
        Dict[str, Any]: Sensitivity analysis results and analytics.
    """
    analytics = AnalyticsCollector('hybrid')
    analytics.start_collection()
    logger.info(f"Starting hybrid sensitivity analysis: {param} for {asset}")

    perturbed = perturb_portfolio(param, asset, range_vals, steps, portfolio)
    baseline = run_hybrid_volatility(portfolio, num_simulations=num_simulations, time_periods=time_periods)
    baseline_daily = baseline['portfolio_volatility_daily']
    baseline_annualized = baseline['portfolio_volatility_annualized']

    # Run hybrid volatility at all points
    raw_points = []
    for p in perturbed:
        v = run_hybrid_volatility(p, num_simulations=num_simulations, time_periods=time_periods)['portfolio_volatility_daily']
        raw_points.append((p['perturbed_value'], v))

    # Sample 3 control points for quantum calibration: baseline, midpoint, endpoint
    control_indices = [0, steps // 2, steps - 1]
    quantum_vals = []
    for i in control_indices:
        try:
            qv = run_quantum_volatility(perturbed[i])['portfolio_volatility_daily']
            quantum_vals.append((perturbed[i]['perturbed_value'], qv))
        except Exception:
            quantum_vals.append((perturbed[i]['perturbed_value'], raw_points[i][1]))

    # Fit Gaussian Process to interpolate quantum-calibrated vol surface
    x_train = np.array([x[0] for x in quantum_vals]).reshape(-1, 1)
    y_train = np.array([x[1] for x in quantum_vals])
    kernel = C(1.0) * RBF(length_scale=1.0)
    gp = GaussianProcessRegressor(kernel=kernel, alpha=1e-5).fit(x_train, y_train)

    # --- Hybrid Metrics Calculation ---
    # 1. GP Interpolation Error (MSE at control points)
    gp_preds_at_control = gp.predict(x_train)
    gp_interpolation_mse = float(np.mean((gp_preds_at_control - y_train) ** 2))

    # 2. GP Kernel Parameters
    kernel_params = gp.kernel_.get_params()
    gp_kernel_length_scale = float(kernel_params['k2__length_scale']) if 'k2__length_scale' in kernel_params else None
    gp_kernel_variance = float(kernel_params['k1__constant_value']) if 'k1__constant_value' in kernel_params else None

    # 3. Evaluate hybrid + quantum-corrected results
    results = []
    classical_vols = [v for (_, v) in raw_points]
    hybrid_vols = []
    quantum_corrections = []
    for (val, classical_vol), p in zip(raw_points, perturbed):
        quantum_correction = gp.predict(np.array([[val]]))[0]
        hybrid_vols.append(quantum_correction)
        quantum_corrections.append(quantum_correction - classical_vol)
        result = {
            "perturbed_value": val,
            "portfolio_volatility_daily": quantum_correction,
            "portfolio_volatility_annualized": quantum_correction * np.sqrt(252),
            "volatility": quantum_correction,
            "delta_vs_baseline": quantum_correction - baseline_daily
        }
        results.append(result)
        analytics.add_result(result)

    # 4. Mean/Max Quantum Correction
    mean_quantum_correction = float(np.mean(np.abs(quantum_corrections)))
    max_quantum_correction = float(np.max(np.abs(quantum_corrections)))

    # 5. Fraction of Points with Significant Correction (>1%)
    significant_threshold = 0.01 * np.mean(classical_vols)  # 1% of mean classical vol
    fraction_significant_correction = float(np.mean(np.abs(quantum_corrections) > significant_threshold))

    # 6. Baseline Agreement (hybrid vs quantum at baseline)
    hybrid_baseline = hybrid_vols[0]
    quantum_baseline = y_train[0] if len(y_train) > 0 else None
    hybrid_baseline_vs_quantum = float(hybrid_baseline - quantum_baseline) if quantum_baseline is not None else None

    # 7. Curve Shape Change (number of extrema before/after correction)
    def count_extrema(arr):
        arr = np.array(arr)
        return int(np.sum((np.diff(np.sign(np.diff(arr))) != 0)))
    num_extrema_classical = count_extrema(classical_vols)
    num_extrema_hybrid = count_extrema(hybrid_vols)
    curve_shape_change = int(num_extrema_hybrid - num_extrema_classical)

    # Store hybrid metrics
    hybrid_metrics = {
        "mean_quantum_correction": mean_quantum_correction,
        "max_quantum_correction": max_quantum_correction,
        "fraction_significant_correction": fraction_significant_correction,
        "hybrid_baseline_vs_quantum": hybrid_baseline_vs_quantum,
        "gp_interpolation_mse": gp_interpolation_mse,
        "gp_kernel_length_scale": gp_kernel_length_scale,
        "gp_kernel_variance": gp_kernel_variance,
        "curve_shape_change": curve_shape_change
    }

    analytics.end_collection()
    analytics_summary = analytics.get_analytics_summary() or {}
    analytics_summary["hybrid_metrics"] = hybrid_metrics

    output = format_output(
        perturbation=param,
        asset=asset,
        range_tested=list(np.linspace(range_vals[0], range_vals[1], steps)),
        baseline_portfolio_volatility_daily=baseline_daily,
        baseline_portfolio_volatility_annualized=baseline_annualized,
        results=results,
        analytics=analytics_summary
    )
    logger.info("Hybrid analysis complete")
    return output


def format_output(
    perturbation: str,
    asset: str,
    range_tested: List[float],
    baseline_portfolio_volatility_daily: float,
    baseline_portfolio_volatility_annualized: float,
    results: List[Dict[str, Any]],
    analytics: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Format the output of the hybrid sensitivity analysis.

    Args:
        perturbation (str): Parameter that was perturbed.
        asset (str): Asset perturbed.
        range_tested (List[float]): Range of values tested.
        baseline_portfolio_volatility_daily (float): Baseline daily volatility.
        baseline_portfolio_volatility_annualized (float): Baseline annualized volatility.
        results (List[Dict[str, Any]]): List of results for each perturbation.
        analytics (Dict[str, Any], optional): Analytics summary. Defaults to None.

    Returns:
        Dict[str, Any]: Formatted output dictionary.
    """
    output = {
        "perturbation": perturbation,
        "asset": asset,
        "range_tested": range_tested,
        "baseline_portfolio_volatility_daily": baseline_portfolio_volatility_daily,
        "baseline_portfolio_volatility_annualized": baseline_portfolio_volatility_annualized,
        "results": results,
        "processing_mode": "hybrid",
        "description": "Hybrid quantum-classical simulation for portfolio sensitivity analysis with quantum-enhanced interpolation"
    }
    if analytics:
        output["analytics"] = analytics
    return output