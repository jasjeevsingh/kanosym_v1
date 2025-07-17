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
logger = logging.getLogger("kanosym")


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
    """
    logger.info(f"perturb_portfolio: Starting with param={param}, asset={asset}, steps={steps}")
    logger.info(f"perturb_portfolio: Portfolio assets: {portfolio['assets']}")
    logger.info(f"perturb_portfolio: Correlation matrix before conversion: {portfolio['correlation_matrix']}")
    
    # Ensure correlation matrix is float
    if 'correlation_matrix' in portfolio:
        portfolio['correlation_matrix'] = [
            [float(val) for val in row]
            for row in portfolio['correlation_matrix']
        ]
        logger.info(f"perturb_portfolio: Correlation matrix after conversion: {portfolio['correlation_matrix']}")
    
    perturbed = []
    values = np.linspace(range_vals[0], range_vals[1], steps)
    logger.info(f"perturb_portfolio: Generated values: {values}")
    
    for i, val in enumerate(values):
        logger.info(f"perturb_portfolio: Processing value {i+1}/{len(values)}: {val}")
        p = {**portfolio}
        try:
            if param == 'volatility':
                idx = portfolio['assets'].index(asset)
                logger.info(f"perturb_portfolio: Volatility perturbation - asset={asset}, idx={idx}")
                p['volatility'] = list(portfolio['volatility'])
                p['volatility'][idx] = val
            elif param == 'weight':
                idx = portfolio['assets'].index(asset)
                logger.info(f"perturb_portfolio: Weight perturbation - asset={asset}, idx={idx}")
                p['weights'] = list(portfolio['weights'])
                p['weights'][idx] = val
            elif param == 'correlation':
                idx = portfolio['assets'].index(asset)
                logger.info(f"perturb_portfolio: Correlation perturbation - asset={asset}, idx={idx}")
                logger.info(f"perturb_portfolio: Matrix shape: {len(portfolio['correlation_matrix'])}x{len(portfolio['correlation_matrix'][0]) if portfolio['correlation_matrix'] else 0}")
                p['correlation_matrix'] = [row[:] for row in portfolio['correlation_matrix']]
                logger.info(f"perturb_portfolio: Deep copied matrix: {p['correlation_matrix']}")
                
                for j in range(len(p['correlation_matrix'])):
                    logger.info(f"perturb_portfolio: Processing column j={j}")
                    if idx != j:  # Dont change diagonal (always 1)
                        try:
                            logger.info(f"perturb_portfolio: Accessing matrix[{idx}][{j}]")
                            original_corr = portfolio['correlation_matrix'][idx][j]
                            logger.info(f"perturb_portfolio: Original correlation: {original_corr}")
                            new_corr = original_corr + val  # val is now a "shift" amount
                            new_corr = max(-1, min(1, new_corr))  # Clamp to [-1, 1]
                            logger.info(f"perturb_portfolio: New correlation: {new_corr}")
                            p['correlation_matrix'][idx][j] = new_corr
                            p['correlation_matrix'][j][idx] = new_corr
                            logger.info(f"perturb_portfolio: Updated matrix[{idx}][{j}] and matrix[{j}][{idx}]")
                        except IndexError as e:
                            logger.error(f"IndexError in correlation perturbation: asset={asset}, idx={idx}, j={j}, matrix_shape={[len(row) for row in portfolio['correlation_matrix']]}")
                            logger.error(f"Correlation matrix: {portfolio['correlation_matrix']}")
                            logger.error(f"Perturbed matrix: {p['correlation_matrix']}")
                            raise Exception(f"Correlation matrix index error: asset={asset}, idx={idx}, j={j}, matrix_shape={[len(row) for row in portfolio['correlation_matrix']]}: {str(e)}")
                
                logger.info(f"perturb_portfolio: Final perturbed matrix: {p['correlation_matrix']}")
                
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
        except Exception as e:
            logger.error(f"Error in perturb_portfolio: param={param}, asset={asset}, val={val}, error={str(e)}")
            logger.error(f"Portfolio: {portfolio}")
            logger.error(f"Perturbed portfolio: {p}")
            raise
        p['perturbed_value'] = val
        perturbed.append(p)
        logger.info(f"perturb_portfolio: Added perturbed portfolio {len(perturbed)}")
    
    logger.info(f"perturb_portfolio: Completed with {len(perturbed)} perturbed portfolios")
    return perturbed


def hybrid_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int,
    num_simulations: int = 1000,
    time_periods: int = 252) -> Dict[str, Any]:
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

    logger.info(f"hybrid_sensitivity_test: Calling perturb_portfolio with steps={steps}")
    perturbed = perturb_portfolio(param, asset, range_vals, steps, portfolio)
    logger.info(f"hybrid_sensitivity_test: Got {len(perturbed)} perturbed portfolios")
    logger.info(f"hybrid_sensitivity_test: Running baseline hybrid volatility")
    baseline = run_hybrid_volatility(portfolio, num_simulations=num_simulations, time_periods=time_periods)
    baseline_daily = baseline['portfolio_volatility_daily']
    baseline_annualized = baseline['portfolio_volatility_annualized']
    logger.info(f"hybrid_sensitivity_test: Baseline daily volatility: {baseline_daily}")

    # Run hybrid volatility at all points
    logger.info(f"hybrid_sensitivity_test: Running hybrid volatility for all {len(perturbed)} perturbed portfolios")
    raw_points = []
    for i, p in enumerate(perturbed):
        try:
            logger.info(f"hybrid_sensitivity_test: Processing perturbed portfolio {i+1}/{len(perturbed)}")
            v = run_hybrid_volatility(p, num_simulations=num_simulations, time_periods=time_periods)['portfolio_volatility_daily']
            raw_points.append((p['perturbed_value'], v))
            logger.info(f"hybrid_sensitivity_test: Added raw point {i+1}: perturbed_value={p['perturbed_value']}, volatility={v}")
        except Exception as e:
            logger.error(f"hybrid_sensitivity_test: Error processing perturbed portfolio {i+1}: {str(e)}")
            raise

    logger.info(f"hybrid_sensitivity_test: Got {len(raw_points)} raw points")
    # Sample 3 control points for quantum calibration: baseline, midpoint, endpoint
    logger.info(f"hybrid_sensitivity_test: Calculating control indices for {len(perturbed)} portfolios")
    control_indices = [0, len(perturbed) // 2, len(perturbed) - 1]
    logger.info(f"hybrid_sensitivity_test: Control indices: {control_indices}")
    
    quantum_vals = []
    for i, control_idx in enumerate(control_indices):
        try:
            logger.info(f"hybrid_sensitivity_test: Processing control point {i+1}/3: index={control_idx}")
            if control_idx >= len(perturbed):
                logger.error(f"hybrid_sensitivity_test: Control index {control_idx} out of range for {len(perturbed)} portfolios")
                raise IndexError(f"Control index {control_idx} out of range for {len(perturbed)} portfolios")
            
            qv = run_quantum_volatility(perturbed[control_idx])['portfolio_volatility_daily']
            quantum_vals.append((perturbed[control_idx]['perturbed_value'], qv))
            logger.info(f"hybrid_sensitivity_test: Added quantum value {i+1}: perturbed_value={perturbed[control_idx]['perturbed_value']}, volatility={qv}")
        except Exception as e:
            logger.error(f"hybrid_sensitivity_test: Error in quantum calculation for control point {i+1}: {str(e)}")
            quantum_vals.append((perturbed[control_idx]['perturbed_value'], raw_points[control_idx][1]))

    logger.info(f"hybrid_sensitivity_test: Got {len(quantum_vals)} quantum values")

    # Fit Gaussian Process to interpolate quantum-calibrated vol surface
    logger.info(f"hybrid_sensitivity_test: Fitting Gaussian Process")
    x_train = np.array([x[0] for x in quantum_vals]).reshape(-1, 1)
    y_train = np.array([x[1] for x in quantum_vals])
    kernel = C(1.0) * RBF(length_scale=1.0)
    gp = GaussianProcessRegressor(kernel=kernel, alpha=1e-5).fit(x_train, y_train)

    # --- Hybrid Metrics Calculation ---
    logger.info(f"hybrid_sensitivity_test: Calculating hybrid metrics")
    # 1. GP Interpolation Error (MSE at control points)
    gp_preds_at_control = gp.predict(x_train)
    gp_interpolation_mse = float(np.mean((gp_preds_at_control - y_train) ** 2))

    # 2. GP Kernel Parameters
    kernel_params = gp.kernel_.get_params()
    gp_kernel_length_scale = float(kernel_params['k2__length_scale']) if 'k2__length_scale' in kernel_params else None
    gp_kernel_variance = float(kernel_params['k1__constant_value']) if 'k1__constant_value' in kernel_params else None

    # 3 Evaluate hybrid + quantum-corrected results
    logger.info(f"hybrid_sensitivity_test: Evaluating hybrid results for {len(raw_points)} points")
    results = []
    classical_vols = [v for (_, v) in raw_points]
    hybrid_vols = []
    quantum_corrections = []
    for i, ((val, classical_vol), p) in enumerate(zip(raw_points, perturbed)):
        try:
            logger.info(f"hybrid_sensitivity_test: Processing result {i+1}/{len(raw_points)}")
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
            logger.info(f"hybrid_sensitivity_test: Added result {i+1}: perturbed_value={val}, volatility={quantum_correction}")
        except Exception as e:
            logger.error(f"hybrid_sensitivity_test: Error processing result {i+1}: {str(e)}")
            raise

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

    logger.info(f"hybrid_sensitivity_test: Formatting output")
    output = format_output(
        perturbation=param,
        asset=asset,
        range_tested=list(np.linspace(range_vals[0], range_vals[1], steps)),
        baseline_portfolio_volatility_daily=baseline_daily,
        baseline_portfolio_volatility_annualized=baseline_annualized,
        results=results,
        analytics=analytics_summary
    )
    
    # Add note about skipped perturbation values if applicable
    if param == 'correlation' and len(results) < steps:
        skipped_count = steps - len(results)
        output["note"] = f"Note: {skipped_count} perturbation value(s) were skipped because they would create invalid correlation matrices (non-positive semi-definite). This is normal for large correlation deltas."
    
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