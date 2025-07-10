#!/usr/bin/env python3
"""
Test script for the analytics system.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from analytics import AnalyticsCollector, format_analytics_for_frontend
from model_blocks.quantum.quantum_sensitivity import quantum_sensitivity_test
from model_blocks.classical.classical_sensitivity import classical_sensitivity_test
from model_blocks.hybrid.hybrid_sensitivity import hybrid_sensitivity_test

def test_analytics():
    """Test the analytics system with sample data."""
    
    # Sample portfolio data
    portfolio = {
        "assets": ["AAPL", "GOOGL", "MSFT"],
        "weights": [0.4, 0.3, 0.3],
        "volatility": [0.2, 0.25, 0.18],
        "correlation_matrix": [
            [1.0, 0.3, 0.2],
            [0.3, 1.0, 0.4],
            [0.2, 0.4, 1.0]
        ]
    }
    
    print("Testing Analytics System...")
    print("=" * 50)
    
    # Test quantum analytics
    print("\n1. Testing Quantum Analytics:")
    print("-" * 30)
    try:
        quantum_result = quantum_sensitivity_test(
            portfolio=portfolio,
            param="volatility",
            asset="AAPL",
            range_vals=[0.15, 0.25],
            steps=5
        )
        
        if 'analytics' in quantum_result:
            print("✅ Quantum analytics collected successfully")
            print(f"   Mode: {quantum_result['analytics']['mode']}")
            print(f"   Execution time: {quantum_result['analytics']['performance_metrics']['total_execution_time']:.3f}s")
            print(f"   Steps processed: {quantum_result['analytics']['performance_metrics']['steps_processed']}")
            if 'quantum_metrics' in quantum_result['analytics']:
                print(f"   Enhancement factor: {quantum_result['analytics']['quantum_metrics']['enhancement_factor']:.4f}")
        else:
            print("❌ No analytics data in quantum result")
            
    except Exception as e:
        print(f"❌ Quantum analytics test failed: {e}")
    
    # Test classical analytics
    print("\n2. Testing Classical Analytics:")
    print("-" * 30)
    try:
        classical_result = classical_sensitivity_test(
            portfolio=portfolio,
            param="volatility",
            asset="AAPL",
            range_vals=[0.15, 0.25],
            steps=5
        )
        
        if 'analytics' in classical_result:
            print("✅ Classical analytics collected successfully")
            print(f"   Mode: {classical_result['analytics']['mode']}")
            print(f"   Execution time: {classical_result['analytics']['performance_metrics']['total_execution_time']:.3f}s")
            print(f"   Steps processed: {classical_result['analytics']['performance_metrics']['steps_processed']}")
            if 'classical_metrics' in classical_result['analytics']:
                print(f"   Simulations per second: {classical_result['analytics']['classical_metrics']['simulations_per_second']:.0f}")
        else:
            print("❌ No analytics data in classical result")
            
    except Exception as e:
        print(f"❌ Classical analytics test failed: {e}")
    
    # Test hybrid analytics
    print("\n3. Testing Hybrid Analytics:")
    print("-" * 30)
    try:
        hybrid_result = hybrid_sensitivity_test(
            portfolio=portfolio,
            param="volatility",
            asset="AAPL",
            range_vals=[0.15, 0.25],
            steps=5
        )
        
        if 'analytics' in hybrid_result:
            print("✅ Hybrid analytics collected successfully")
            print(f"   Mode: {hybrid_result['analytics']['mode']}")
            print(f"   Execution time: {hybrid_result['analytics']['performance_metrics']['total_execution_time']:.3f}s")
            print(f"   Steps processed: {hybrid_result['analytics']['performance_metrics']['steps_processed']}")
            if 'hybrid_metrics' in hybrid_result['analytics']:
                print(f"   Synergy factor: {hybrid_result['analytics']['hybrid_metrics']['synergy_factor']:.4f}")
        else:
            print("❌ No analytics data in hybrid result")
            
    except Exception as e:
        print(f"❌ Hybrid analytics test failed: {e}")
    
    # Test analytics collector directly
    print("\n4. Testing Analytics Collector Directly:")
    print("-" * 30)
    try:
        collector = AnalyticsCollector('quantum')
        collector.start_collection()
        
        # Simulate some results
        collector.add_result({"perturbed_value": 0.15, "volatility": 0.15})
        collector.add_result({"perturbed_value": 0.18, "volatility": 0.18})
        collector.add_result({"perturbed_value": 0.20, "volatility": 0.20})
        
        collector.end_collection()
        
        analytics_summary = collector.get_analytics_summary()
        formatted_analytics = format_analytics_for_frontend(analytics_summary)
        
        print("✅ Analytics collector working correctly")
        print(f"   Performance metrics: {formatted_analytics['performance']['execution_time']}")
        print(f"   Statistical metrics: {formatted_analytics['statistical']['confidence_interval']}")
        
    except Exception as e:
        print(f"❌ Analytics collector test failed: {e}")
    
    print("\n" + "=" * 50)
    print("Analytics system test completed!")

if __name__ == "__main__":
    test_analytics() 