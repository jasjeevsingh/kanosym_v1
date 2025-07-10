#!/usr/bin/env python3
"""
Test script to validate the new modal functionality with dynamic asset management.
Tests various portfolio configurations from 1 to 5 assets.
"""

import requests
import json
import numpy as np

BASE_URL = "http://localhost:5001"

def create_test_portfolio(num_assets):
    """Create a test portfolio with the specified number of assets."""
    if num_assets == 1:
        assets = ["AAPL"]
        weights = [1.0]
        volatility = [0.2]
        correlation_matrix = [[1.0]]
    elif num_assets == 2:
        assets = ["AAPL", "GOOG"]
        weights = [0.6, 0.4]
        volatility = [0.2, 0.18]
        correlation_matrix = [[1.0, 0.3], [0.3, 1.0]]
    elif num_assets == 3:
        assets = ["AAPL", "GOOG", "MSFT"]
        weights = [0.4, 0.3, 0.3]
        volatility = [0.2, 0.18, 0.22]
        correlation_matrix = [[1.0, 0.2, 0.1], [0.2, 1.0, 0.15], [0.1, 0.15, 1.0]]
    elif num_assets == 4:
        assets = ["AAPL", "GOOG", "MSFT", "TSLA"]
        weights = [0.3, 0.25, 0.25, 0.2]
        volatility = [0.2, 0.18, 0.22, 0.35]
        correlation_matrix = [
            [1.0, 0.2, 0.1, 0.05],
            [0.2, 1.0, 0.15, 0.08],
            [0.1, 0.15, 1.0, 0.12],
            [0.05, 0.08, 0.12, 1.0]
        ]
    elif num_assets == 5:
        assets = ["AAPL", "GOOG", "MSFT", "TSLA", "AMZN"]
        weights = [0.25, 0.2, 0.2, 0.15, 0.2]
        volatility = [0.2, 0.18, 0.22, 0.35, 0.28]
        correlation_matrix = [
            [1.0, 0.2, 0.1, 0.05, 0.08],
            [0.2, 1.0, 0.15, 0.08, 0.12],
            [0.1, 0.15, 1.0, 0.12, 0.1],
            [0.05, 0.08, 0.12, 1.0, 0.15],
            [0.08, 0.12, 0.1, 0.15, 1.0]
        ]
    else:
        raise ValueError(f"Unsupported number of assets: {num_assets}")
    
    return {
        "assets": assets,
        "weights": weights,
        "volatility": volatility,
        "correlation_matrix": correlation_matrix
    }

def test_portfolio_validation(portfolio, test_name):
    """Test portfolio validation with the backend."""
    print(f"\n=== Testing {test_name} ===")
    print(f"Assets: {portfolio['assets']}")
    print(f"Weights: {portfolio['weights']}")
    print(f"Volatility: {portfolio['volatility']}")
    
    # Test data for sensitivity analysis
    test_data = {
        "portfolio": portfolio,
        "param": "volatility",
        "asset": portfolio["assets"][0],
        "range": [0.15, 0.25],
        "steps": 5
    }
    
    # Test classical sensitivity endpoint
    try:
        response = requests.post(f"{BASE_URL}/api/classical_sensitivity_test", 
                               json=test_data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {test_name} - SUCCESS")
            print(f"   Baseline Sharpe: {result.get('baseline_sharpe', 'N/A'):.4f}")
            print(f"   Results count: {len(result.get('results', []))}")
        else:
            error_data = response.json()
            print(f"❌ {test_name} - FAILED")
            print(f"   Status: {response.status_code}")
            print(f"   Error: {error_data.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ {test_name} - EXCEPTION")
        print(f"   Error: {str(e)}")

def test_invalid_portfolios():
    """Test various invalid portfolio configurations."""
    print("\n=== Testing Invalid Portfolios ===")
    
    # Test 1: Empty assets
    invalid_portfolio = {
        "assets": [],
        "weights": [],
        "volatility": [],
        "correlation_matrix": []
    }
    test_data = {
        "portfolio": invalid_portfolio,
        "param": "volatility",
        "asset": "AAPL",
        "range": [0.15, 0.25],
        "steps": 5
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/classical_sensitivity_test", 
                               json=test_data, timeout=10)
        if response.status_code == 400:
            error_data = response.json()
            print(f"✅ Empty portfolio validation - SUCCESS")
            print(f"   Error: {error_data.get('error', 'Unknown error')}")
        else:
            print(f"❌ Empty portfolio validation - FAILED (expected 400, got {response.status_code})")
    except Exception as e:
        print(f"❌ Empty portfolio validation - EXCEPTION: {str(e)}")
    
    # Test 2: Too many assets
    large_portfolio = create_test_portfolio(5)
    large_portfolio["assets"].append("NVDA")
    large_portfolio["weights"].append(0.1)
    large_portfolio["volatility"].append(0.25)
    # Add row and column to correlation matrix
    for row in large_portfolio["correlation_matrix"]:
        row.append(0.1)
    large_portfolio["correlation_matrix"].append([0.1, 0.1, 0.1, 0.1, 0.1, 1.0])
    
    test_data = {
        "portfolio": large_portfolio,
        "param": "volatility",
        "asset": "AAPL",
        "range": [0.15, 0.25],
        "steps": 5
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/classical_sensitivity_test", 
                               json=test_data, timeout=10)
        if response.status_code == 400:
            error_data = response.json()
            print(f"✅ Too many assets validation - SUCCESS")
            print(f"   Error: {error_data.get('error', 'Unknown error')}")
        else:
            print(f"❌ Too many assets validation - FAILED (expected 400, got {response.status_code})")
    except Exception as e:
        print(f"❌ Too many assets validation - EXCEPTION: {str(e)}")

def main():
    """Run all tests."""
    print("🧪 Testing Modal Functionality with Dynamic Asset Management")
    print("=" * 60)
    
    # Test valid portfolios with different numbers of assets
    for num_assets in range(1, 6):
        portfolio = create_test_portfolio(num_assets)
        test_portfolio_validation(portfolio, f"{num_assets} Asset Portfolio")
    
    # Test invalid portfolios
    test_invalid_portfolios()
    
    print("\n" + "=" * 60)
    print("✅ Testing completed!")

if __name__ == "__main__":
    main() 