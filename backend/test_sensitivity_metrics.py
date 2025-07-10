#!/usr/bin/env python3
"""
Test script for the sensitivity metrics functionality.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from analytics import AnalyticsCollector, format_analytics_for_frontend

def test_sensitivity_metrics():
    """Test the sensitivity metrics calculation."""
    
    print("Testing Sensitivity Metrics...")
    print("=" * 50)
    
    # Create analytics collector
    collector = AnalyticsCollector('quantum')
    collector.start_collection()
    
    # Add sample results that would simulate a sensitivity test
    sample_results = [
        {"perturbed_value": 0.15, "sharpe": 1.20},
        {"perturbed_value": 0.18, "sharpe": 1.35},
        {"perturbed_value": 0.20, "sharpe": 1.25},
        {"perturbed_value": 0.22, "sharpe": 1.10},
        {"perturbed_value": 0.25, "sharpe": 0.95}
    ]
    
    for result in sample_results:
        collector.add_result(result)
    
    collector.end_collection()
    
    # Get analytics summary
    analytics = collector.get_analytics_summary()
    
    # Format for frontend
    formatted_analytics = format_analytics_for_frontend(analytics)
    
    print("\nSensitivity Metrics Results:")
    print("-" * 30)
    
    if 'sensitivity_metrics' in analytics:
        sm = analytics['sensitivity_metrics']
        print(f"✅ Sharpe Ratio Range: {sm['sharpe_range'][0]:.4f} - {sm['sharpe_range'][1]:.4f}")
        print(f"✅ Sharpe Volatility: {sm['sharpe_volatility']:.4f}")
        print(f"✅ Max Sensitivity Point: {sm['max_sensitivity_point']:.4f}")
        print(f"✅ Curve Steepness: {sm['curve_steepness']:.4f}")
        print(f"✅ Risk-Return Ratio: {sm['risk_return_ratio']:.4f}")
        print(f"✅ Portfolio Beta: {sm['portfolio_beta']:.4f}")
        print(f"✅ Value at Risk (95%): {sm['var_95']:.4f}")
        print(f"✅ Expected Shortfall: {sm['expected_shortfall']:.4f}")
        print(f"✅ Information Ratio: {sm['information_ratio']:.4f}")
        print(f"✅ Sortino Ratio: {sm['sortino_ratio']:.4f}")
        print(f"✅ Calmar Ratio: {sm['calmar_ratio']:.4f}")
        print(f"✅ Maximum Drawdown: {sm['max_drawdown']:.4f}")
        
        print("\n📊 Finance Analysis:")
        print("-" * 20)
        
        # Interpret the results
        sharpe_range = sm['sharpe_range']
        sharpe_vol = sm['sharpe_volatility']
        max_sens = sm['max_sensitivity_point']
        curve_steep = sm['curve_steepness']
        
        print(f"• Sharpe ratio varies from {sharpe_range[0]:.4f} to {sharpe_range[1]:.4f}")
        print(f"• Portfolio shows {sharpe_vol:.4f} volatility in Sharpe ratios")
        print(f"• Maximum sensitivity occurs at parameter value {max_sens:.4f}")
        print(f"• Sensitivity curve has steepness of {curve_steep:.4f}")
        
        if sm['var_95'] < 1.0:
            print("• Portfolio shows low downside risk (VaR < 1.0)")
        else:
            print("• Portfolio shows moderate downside risk")
            
        if sm['information_ratio'] > 0.5:
            print("• Good information ratio indicates effective active management")
        else:
            print("• Information ratio suggests room for improvement")
            
    else:
        print("❌ No sensitivity metrics found in analytics")
    
    print("\n📱 Frontend Formatted Data:")
    print("-" * 30)
    if 'sensitivity' in formatted_analytics:
        fs = formatted_analytics['sensitivity']
        print(f"Sharpe Range: {fs['sharpe_range']['min']} - {fs['sharpe_range']['max']}")
        print(f"Sharpe Volatility: {fs['sharpe_volatility']}")
        print(f"Max Sensitivity Point: {fs['max_sensitivity_point']}")
        print(f"Curve Steepness: {fs['curve_steepness']}")
        print(f"Risk-Return Ratio: {fs['risk_return_ratio']}")
        print(f"Portfolio Beta: {fs['portfolio_beta']}")
        print(f"VaR (95%): {fs['var_95']}")
        print(f"Expected Shortfall: {fs['expected_shortfall']}")
        print(f"Information Ratio: {fs['information_ratio']}")
        print(f"Sortino Ratio: {fs['sortino_ratio']}")
        print(f"Calmar Ratio: {fs['calmar_ratio']}")
        print(f"Max Drawdown: {fs['max_drawdown']}")
    
    print("\n" + "=" * 50)
    print("Sensitivity metrics test completed!")

if __name__ == "__main__":
    test_sensitivity_metrics() 