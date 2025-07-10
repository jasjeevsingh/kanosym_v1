"""
noira_utils.py

Utility functions for integrating with Noira chat system.
Allows model blocks to automatically send explanatory messages to Noira.
"""

import json
from typing import Dict, Any, Optional, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def send_message_to_noira(
    analysis_type: str,
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int,
    results: Dict[str, Any],
    analysis_id: Optional[str] = None
) -> Tuple[bool, str, Optional[str]]:
    """
    Send an explanatory message to Noira about the analysis that was just run.
    
    Args:
        analysis_type: Type of analysis ('quantum', 'classical', 'hybrid')
        portfolio: Portfolio configuration used
        param: Parameter that was perturbed
        asset: Asset that was perturbed
        range_vals: Range of values tested
        steps: Number of steps
        results: Analysis results
        
    Returns:
        Tuple of (success: bool, brief_message: str, llm_response: Optional[str])
        - success: Whether the message was successfully sent to Noira
        - brief_message: Short message for frontend display
        - llm_response: The actual response from Noira
    """
    # Create brief message for frontend
    brief_message = f"Tell me about this {analysis_type} sensitivity test for {asset} {param}."
    
    try:
        # Import here to avoid circular imports
        from noira.chat_controller import chat_controller
        
        # Only proceed if API key is set
        if not chat_controller.api_key:
            logger.info(f"Noira API key not set, skipping explanation for {analysis_type} analysis")
            return False, brief_message, None
        
        # Create context about the analysis
        context = {
            "analysis_type": analysis_type,
            "portfolio": {
                "assets": portfolio.get('assets', []),
                "num_assets": len(portfolio.get('assets', [])),
                "perturbation_parameter": param,
                "perturbed_asset": asset
            },
            "analysis_details": {
                "parameter_range": range_vals,
                "steps": steps,
                "baseline_volatility": results.get('baseline_volatility'),
                "processing_mode": results.get('processing_mode')
            }
        }
        
        # Add analysis_id if provided
        if analysis_id:
            context["analysis_id"] = analysis_id
        
        # Create a message asking Noira to explain the results
        full_message = create_explanation_request(analysis_type, param, asset, results)
        
        # Send message to Noira
        result = chat_controller.send_message(full_message, context)
        if result.get('success'):
            logger.info(f"Successfully sent {analysis_type} analysis explanation to Noira")
            llm_response = result.get('response', '')
            return True, brief_message, llm_response
        else:
            logger.warning(f"Failed to send message to Noira: {result.get('message')}")
            return False, brief_message, None
            
    except Exception as e:
        logger.error(f"Error sending message to Noira: {str(e)}")
        return False, brief_message, None


def create_explanation_request(
    analysis_type: str, 
    param: str, 
    asset: str, 
    results: Dict[str, Any]
) -> str:
    """
    Create a message asking Noira to explain the analysis results quantitatively.
    
    Args:
        analysis_type: Type of analysis performed
        param: Parameter that was perturbed
        asset: Asset that was perturbed
        results: Analysis results
        
    Returns:
        Message string for Noira
    """
    # Handle different baseline field names from different analysis types
    baseline_volatility = None
    if analysis_type == 'quantum':
        baseline_volatility = results.get('baseline_portfolio_volatility_daily')
        if baseline_volatility is None:
            baseline_volatility = results.get('baseline_portfolio_volatility_annualized')
    elif analysis_type in ['classical', 'hybrid']:
        baseline_volatility = results.get('baseline_sharpe')
    
    # Fallback to generic baseline_volatility field if available
    if baseline_volatility is None:
        baseline_volatility = results.get('baseline_volatility')
    
    # If still None or not a number, set to a safe default
    if baseline_volatility is None or not isinstance(baseline_volatility, (int, float)):
        baseline_volatility = 0.0
        baseline_volatility_display = 'N/A'
    else:
        baseline_volatility_display = f"{baseline_volatility:.4f}"
    
    num_results = len(results.get('results', []))
    range_tested = results.get('range_tested', [])
    
    # Calculate detailed sensitivity metrics
    if results.get('results'):
        deltas = [r.get('delta_vs_baseline', 0) for r in results['results']]
        volatility_values = [r.get('volatility', r.get('sharpe', 0)) for r in results['results']]
        perturbed_values = [r.get('perturbed_value', 0) for r in results['results']]
        
        max_positive_change = max(deltas) if deltas else 0
        max_negative_change = min(deltas) if deltas else 0
        avg_change = sum(deltas) / len(deltas) if deltas else 0
        volatility = (sum([(d - avg_change)**2 for d in deltas]) / len(deltas))**0.5 if len(deltas) > 1 else 0
        
        # Determine risk level with specific thresholds
        max_abs_change = max(abs(max_positive_change), abs(max_negative_change))
        if max_abs_change > 0.2:
            risk_level = "HIGH RISK"
        elif max_abs_change > 0.1:
            risk_level = "MODERATE RISK"
        elif max_abs_change > 0.05:
            risk_level = "LOW RISK"
        else:
            risk_level = "MINIMAL RISK"
        
        # Analyze graph characteristics - pass the numeric baseline value
        graph_analysis = analyze_sensitivity_curve(perturbed_values, volatility_values, baseline_volatility)
        
    else:
        max_positive_change = 0
        max_negative_change = 0
        avg_change = 0
        volatility = 0
        risk_level = "UNKNOWN"
        graph_analysis = {
            "curve_shape": "No data available",
            "trend_direction": "Unknown",
            "inflection_points": [],
            "optimal_range": "Cannot determine",
            "linearity": "Unknown"
        }

    # Build detailed data table for the graph
    graph_data_table = ""
    if results.get('results'):
        graph_data_table = "\n| Parameter Value | Volatility | Change from Baseline | % Change |\n"
        graph_data_table += "|----------------|--------------|---------------------|----------|\n"
        for r in results['results']:
            pval = r.get('perturbed_value', 0)
            vol_val = r.get('volatility', r.get('sharpe', 0))
            delta = r.get('delta_vs_baseline', 0)
            # Only calculate percentage if baseline_volatility is a valid number > 0
            if isinstance(baseline_volatility, (int, float)) and baseline_volatility != 0:
                pct_change = (delta / baseline_volatility * 100)
            else:
                pct_change = 0
            graph_data_table += f"| {pval:.4f} | {vol_val:.4f} | {delta:+.4f} | {pct_change:+.2f}% |\n"

    message = f"""I completed a {analysis_type} sensitivity analysis. Provide a QUANTITATIVE summary of the results and a recommended course of action for my portfolio.

## 📊 Analysis Data

| Metric | Value |
|--------|-------|
| **Method** | {analysis_type.title()} sensitivity testing |
| **Parameter** | {param} for asset {asset} |
| **Parameter Range** | {range_tested[0]:.4f} to {range_tested[-1]:.4f} |
| **Baseline {analysis_type.title()} Metric** | {baseline_volatility_display} |
| **Test Points** | {num_results} |
| **Risk Classification** | **{risk_level}** |

## 📊 Mathematical Framework

The Sharpe ratio being analyzed is defined as:

$$\\text{{Sharpe Ratio}} = \\frac{{E[R_p] - R_f}}{{\\sigma_p}}$$

Where:
- $E[R_p]$ = Expected portfolio return
- $R_f$ = Risk-free rate  
- $\\sigma_p$ = Portfolio standard deviation

For this sensitivity analysis, we perturbed the {param} parameter and measured:

$$\\Delta S = S_{{\\text{{perturbed}}}} - S_{{\\text{{baseline}}}}$$

## 📈 Quantitative Results

| Result Type | Value | Percentage |
|-------------|-------|------------|
| **Maximum Upside** | {max_positive_change:.4f} | {max_positive_change*100:.2f}% |
| **Maximum Downside** | {max_negative_change:.4f} | {max_negative_change*100:.2f}% |
| **Average Change** | {avg_change:.4f} | {avg_change*100:.2f}% |
| **Change Volatility** | {volatility:.4f} | - |

The sensitivity coefficient can be expressed as:

$$\\beta_{{\\text{{sensitivity}}}} = \\frac{{\\partial S}}{{\\partial \\theta}} \\approx \\frac{{\\Delta S}}{{\\Delta \\theta}}$$

Where $\\theta$ represents the {param} parameter.

## 📊 Graph Analysis - Sensitivity Curve Characteristics

| Graph Feature | Analysis |
|---------------|----------|
| **Curve Shape** | {graph_analysis['curve_shape']} |
| **Overall Trend** | {graph_analysis['trend_direction']} |
| **Linearity** | {graph_analysis['linearity']} |
| **Optimal Range** | {graph_analysis['optimal_range']} |
| **Inflection Points** | {graph_analysis['inflection_points']} |

## 📋 Complete Data Set from Graph
{graph_data_table}

Focus on translating the **patterns in the sensitivity chart** into concrete investment decisions. Reference specific data points from the table and curve characteristics in your analysis.

**IMPORTANT:**
- Be specific with numbers and use mathematical notation where appropriate
- Include LaTeX formulas to explain key financial concepts
- Use markdown formatting extensively  
- Provide actionable insights
- Reference specific data points from the table and curve characteristics in your analysis
- Express portfolio optimization insights using mathematical formulations"""

    return message


def analyze_sensitivity_curve(param_values: list, volatility_values: list, baseline_volatility: float) -> Dict[str, str]:
    """
    Analyze the characteristics of the sensitivity curve for graph interpretation.
    
    Args:
        param_values: List of parameter values (x-axis)
        volatility_values: List of Volatility values (y-axis) 
        baseline_volatility: Baseline Volatility for reference
        
    Returns:
        Dictionary with curve analysis characteristics
    """
    import numpy as np
    
    if len(param_values) < 3:
        return {
            "curve_shape": "Insufficient data for analysis",
            "trend_direction": "Unknown",
            "inflection_points": "Cannot determine",
            "optimal_range": "Insufficient data",
            "linearity": "Unknown"
        }
    
    # Ensure we have valid numeric data
    try:
        param_array = np.array(param_values, dtype=float)
        volatility_array = np.array(volatility_values, dtype=float)
        
        # Remove any NaN or infinite values
        valid_mask = np.isfinite(param_array) & np.isfinite(volatility_array)
        param_array = param_array[valid_mask]
        volatility_array = volatility_array[valid_mask]
        
        if len(param_array) < 3:
            return {
                "curve_shape": "Insufficient valid data for analysis",
                "trend_direction": "Unknown",
                "inflection_points": "Cannot determine",
                "optimal_range": "Insufficient data",
                "linearity": "Unknown"
            }
    except (ValueError, TypeError):
        return {
            "curve_shape": "Invalid data format",
            "trend_direction": "Unknown",
            "inflection_points": "Cannot determine",
            "optimal_range": "Invalid data",
            "linearity": "Unknown"
        }
    
    # Sort by parameter values to ensure proper order
    sorted_indices = np.argsort(param_array)
    param_sorted = param_array[sorted_indices]
    volatility_sorted = volatility_array[sorted_indices]
    
    # Calculate first and second derivatives (approximate)
    first_deriv = np.gradient(volatility_sorted, param_sorted)
    second_deriv = np.gradient(first_deriv, param_sorted)
    
    # Analyze curve shape
    if np.std(second_deriv) < 0.01:
        curve_shape = "Linear relationship"
    elif np.mean(second_deriv) > 0.01:
        curve_shape = "Convex (accelerating upward)"
    elif np.mean(second_deriv) < -0.01:
        curve_shape = "Concave (diminishing returns)"
    else:
        curve_shape = "Mixed curvature with inflection points"
    
    # Analyze trend direction
    if param_sorted[-1] == param_sorted[0]:  # Avoid division by zero
        trend_direction = "Flat/Neutral (no parameter variation)"
    else:
        overall_slope = (volatility_sorted[-1] - volatility_sorted[0]) / (param_sorted[-1] - param_sorted[0])
        if overall_slope > 0.01:
            trend_direction = f"Positive (slope: {overall_slope:.4f})"
        elif overall_slope < -0.01:
            trend_direction = f"Negative (slope: {overall_slope:.4f})"
        else:
            trend_direction = f"Flat/Neutral (slope: {overall_slope:.4f})"
    
    # Find inflection points (where second derivative changes sign)
    inflection_points = []
    for i in range(1, len(second_deriv) - 1):
        if second_deriv[i-1] * second_deriv[i+1] < 0:  # Sign change
            inflection_points.append(f"{param_sorted[i]:.4f}")
    
    inflection_str = f"{len(inflection_points)} points at: {', '.join(inflection_points)}" if inflection_points else "None detected"
    
    # Find optimal range (highest Volatility ratios)
    max_volatility_idx = np.argmax(volatility_sorted)
    top_25_percent = np.percentile(volatility_sorted, 75)
    optimal_indices = np.where(volatility_sorted >= top_25_percent)[0]
    
    if len(optimal_indices) > 0:
        optimal_min = param_sorted[optimal_indices[0]]
        optimal_max = param_sorted[optimal_indices[-1]]
        optimal_range = f"{optimal_min:.4f} to {optimal_max:.4f} (top 25% performance)"
    else:
        optimal_range = f"Around {param_sorted[max_volatility_idx]:.4f} (peak performance)"
    
    # Assess linearity with improved error handling
    try:
        linear_fit = np.polyfit(param_sorted, volatility_sorted, 1)
        linear_pred = np.polyval(linear_fit, param_sorted)
        
        # Calculate R-squared with safe division
        ss_res = np.sum((volatility_sorted - linear_pred) ** 2)
        ss_tot = np.sum((volatility_sorted - np.mean(volatility_sorted)) ** 2)
        
        if ss_tot == 0:  # All y values are the same
            r_squared = 1.0 if ss_res == 0 else 0.0
        else:
            r_squared = 1 - (ss_res / ss_tot)
        
        if r_squared > 0.95:
            linearity = f"Highly linear (R² = {r_squared:.3f})"
        elif r_squared > 0.8:
            linearity = f"Mostly linear (R² = {r_squared:.3f})"
        else:
            linearity = f"Non-linear (R² = {r_squared:.3f})"
    except (np.linalg.LinAlgError, ValueError):
        linearity = "Cannot determine linearity (insufficient variation)"
    
    return {
        "curve_shape": curve_shape,
        "trend_direction": trend_direction,
        "inflection_points": inflection_str,
        "optimal_range": optimal_range,
        "linearity": linearity
    }


def format_analysis_summary(results: Dict[str, Any]) -> str:
    """
    Create a brief summary of analysis results for logging.
    
    Args:
        results: Analysis results dictionary
        
    Returns:
        Formatted summary string
    """
    processing_mode = results.get('processing_mode', 'unknown')
    
    # Handle different baseline field names from different analysis types
    baseline_value = None
    if processing_mode == 'quantum':
        baseline_value = results.get('baseline_portfolio_volatility_daily')
        if baseline_value is None:
            baseline_value = results.get('baseline_portfolio_volatility_annualized')
        metric_name = "volatility"
    elif processing_mode in ['classical', 'hybrid']:
        baseline_value = results.get('baseline_sharpe')
        metric_name = "Sharpe"
    else:
        baseline_value = results.get('baseline_volatility')
        metric_name = "metric"
    
    # Format the baseline value
    if baseline_value is not None and isinstance(baseline_value, (int, float)):
        baseline_display = f"{baseline_value:.4f}"
    else:
        baseline_display = 'N/A'
    
    num_points = len(results.get('results', []))
    perturbation = results.get('perturbation', 'unknown')
    asset = results.get('asset', 'unknown')
    
    return f"{processing_mode.title()} analysis: {perturbation} sensitivity for {asset} (baseline {metric_name}: {baseline_display}, {num_points} points)"