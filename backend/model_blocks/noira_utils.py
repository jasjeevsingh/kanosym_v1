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
    results: Dict[str, Any]
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
                "baseline_sharpe": results.get('baseline_sharpe'),
                "processing_mode": results.get('processing_mode')
            }
        }
        
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
    baseline_sharpe = results.get('baseline_sharpe', 'unknown')
    num_results = len(results.get('results', []))
    range_tested = results.get('range_tested', [])
    
    # Calculate detailed sensitivity metrics
    if results.get('results'):
        deltas = [r.get('delta_vs_baseline', 0) for r in results['results']]
        sharpe_values = [r.get('sharpe', 0) for r in results['results']]
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
        
        # Analyze graph characteristics
        graph_analysis = analyze_sensitivity_curve(perturbed_values, sharpe_values, baseline_sharpe)
        
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
        graph_data_table = "\n| Parameter Value | Sharpe Ratio | Change from Baseline | % Change |\n"
        graph_data_table += "|----------------|--------------|---------------------|----------|\n"
        for r in results['results']:
            pval = r.get('perturbed_value', 0)
            sharpe = r.get('sharpe', 0)
            delta = r.get('delta_vs_baseline', 0)
            pct_change = (delta / baseline_sharpe * 100) if baseline_sharpe != 0 else 0
            graph_data_table += f"| {pval:.4f} | {sharpe:.4f} | {delta:+.4f} | {pct_change:+.2f}% |\n"

    message = f"""I completed a {analysis_type} sensitivity analysis. Provide a QUANTITATIVE summary of the results and a recommended course of action for my portfolio.

## 📊 Analysis Data

| Metric | Value |
|--------|-------|
| **Method** | {analysis_type.title()} sensitivity testing |
| **Parameter** | {param} for asset {asset} |
| **Parameter Range** | {range_tested[0]:.4f} to {range_tested[-1]:.4f} |
| **Baseline Sharpe** | {baseline_sharpe} |
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


def analyze_sensitivity_curve(param_values: list, sharpe_values: list, baseline_sharpe: float) -> Dict[str, str]:
    """
    Analyze the characteristics of the sensitivity curve for graph interpretation.
    
    Args:
        param_values: List of parameter values (x-axis)
        sharpe_values: List of Sharpe ratios (y-axis) 
        baseline_sharpe: Baseline Sharpe ratio for reference
        
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
    
    param_array = np.array(param_values)
    sharpe_array = np.array(sharpe_values)
    
    # Sort by parameter values to ensure proper order
    sorted_indices = np.argsort(param_array)
    param_sorted = param_array[sorted_indices]
    sharpe_sorted = sharpe_array[sorted_indices]
    
    # Calculate first and second derivatives (approximate)
    first_deriv = np.gradient(sharpe_sorted, param_sorted)
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
    overall_slope = (sharpe_sorted[-1] - sharpe_sorted[0]) / (param_sorted[-1] - param_sorted[0])
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
    
    # Find optimal range (highest Sharpe ratios)
    max_sharpe_idx = np.argmax(sharpe_sorted)
    top_25_percent = np.percentile(sharpe_sorted, 75)
    optimal_indices = np.where(sharpe_sorted >= top_25_percent)[0]
    
    if len(optimal_indices) > 0:
        optimal_min = param_sorted[optimal_indices[0]]
        optimal_max = param_sorted[optimal_indices[-1]]
        optimal_range = f"{optimal_min:.4f} to {optimal_max:.4f} (top 25% performance)"
    else:
        optimal_range = f"Around {param_sorted[max_sharpe_idx]:.4f} (peak performance)"
    
    # Assess linearity
    linear_fit = np.polyfit(param_sorted, sharpe_sorted, 1)
    linear_pred = np.polyval(linear_fit, param_sorted)
    r_squared = 1 - (np.sum((sharpe_sorted - linear_pred) ** 2) / np.sum((sharpe_sorted - np.mean(sharpe_sorted)) ** 2))
    
    if r_squared > 0.95:
        linearity = f"Highly linear (R² = {r_squared:.3f})"
    elif r_squared > 0.8:
        linearity = f"Mostly linear (R² = {r_squared:.3f})"
    else:
        linearity = f"Non-linear (R² = {r_squared:.3f})"
    
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
    baseline_sharpe = results.get('baseline_sharpe', 'N/A')
    num_points = len(results.get('results', []))
    perturbation = results.get('perturbation', 'unknown')
    asset = results.get('asset', 'unknown')
    
    return f"{processing_mode.title()} analysis: {perturbation} sensitivity for {asset} (baseline Sharpe: {baseline_sharpe}, {num_points} points)"