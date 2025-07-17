#!/usr/bin/env python3
"""
Test script for the file manager functionality.
Demonstrates .ksm file and test run file operations.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from file_manager import FileManager
import json

def test_file_manager():
    """Test the file manager functionality."""
    
    print("Testing File Manager...")
    print("=" * 50)
    
    # Initialize file manager
    file_manager = FileManager()
    
    # Test 1: Create a new project
    print("\n1. Creating a new project...")
    try:
        project_config = file_manager.create_project("Test Project Alpha")
        print(f"✅ Created project: {project_config['metadata']['name']}")
        print(f"   Project ID: {project_config['metadata']['project_id']}")
        print(f"   Created: {project_config['metadata']['created']}")
    except Exception as e:
        print(f"❌ Failed to create project: {e}")
        return
    
    # Test 2: List projects
    print("\n2. Listing projects...")
    projects = file_manager.list_projects()
    print(f"✅ Found {len(projects)} projects:")
    for project in projects:
        print(f"   - {project['name']} (ID: {project['project_id']})")
    
    # Test 3: Load project
    print("\n3. Loading project...")
    loaded_config = file_manager.load_project("Test Project Alpha")
    if loaded_config:
        print(f"✅ Loaded project: {loaded_config['metadata']['name']}")
        print(f"   Blocks placed: {sum(1 for block in loaded_config['configuration']['blocks'].values() if block['placed'])}")
    else:
        print("❌ Failed to load project")
    
    # Test 4: Create a test run
    print("\n4. Creating a test run...")
    test_run_data = {
        "block_type": "classical",
        "parameters": {
            "portfolio": {
                "assets": ["AAPL", "GOOGL", "MSFT"],
                "weights": [0.4, 0.3, 0.3],
                "volatility": [0.2, 0.25, 0.18],
                "correlation_matrix": [[1.0, 0.3, 0.2], [0.3, 1.0, 0.4], [0.2, 0.4, 1.0]]
            },
            "param": "volatility",
            "asset": "AAPL",
            "range": [0.15, 0.25],
            "steps": 5
        },
        "results": {
            "perturbation": "volatility",
            "asset": "AAPL",
            "range_tested": [0.15, 0.18, 0.21, 0.24, 0.25],
            "baseline_portfolio_volatility_daily": 0.0215,
            "baseline_portfolio_volatility_annualized": 0.0542,
            "results": [
                {
                    "perturbed_value": 0.15,
                    "portfolio_volatility_daily": 0.0198,
                    "portfolio_volatility_annualized": 0.0499,
                    "delta_vs_baseline": -0.0017
                },
                {
                    "perturbed_value": 0.18,
                    "portfolio_volatility_daily": 0.0205,
                    "portfolio_volatility_annualized": 0.0517,
                    "delta_vs_baseline": -0.0010
                },
                {
                    "perturbed_value": 0.21,
                    "portfolio_volatility_daily": 0.0215,
                    "portfolio_volatility_annualized": 0.0542,
                    "delta_vs_baseline": 0.0000
                },
                {
                    "perturbed_value": 0.24,
                    "portfolio_volatility_daily": 0.0228,
                    "portfolio_volatility_annualized": 0.0575,
                    "delta_vs_baseline": 0.0013
                },
                {
                    "perturbed_value": 0.25,
                    "portfolio_volatility_daily": 0.0235,
                    "portfolio_volatility_annualized": 0.0592,
                    "delta_vs_baseline": 0.0020
                }
            ]
        },
        "analytics": {
            "mode": "classical",
            "performance_metrics": {
                "total_execution_time": 0.234,
                "throughput": 21.4,
                "steps_processed": 5,
                "memory_usage_mb": 45.2,
                "cpu_usage_percent": 12.5
            },
            "statistical_metrics": {
                "confidence_interval_95": [0.0198, 0.0251],
                "coefficient_of_variation": 0.0892,
                "skewness": 0.2341,
                "kurtosis": -0.5678,
                "standard_error": 0.0456,
                "statistical_significance": 0.9876
            },
            "classical_metrics": {
                "simulations_per_second": 1250,
                "iterations_per_second": 850,
                "convergence_rate": 0.95,
                "monte_carlo_efficiency": 0.87
            },
            "sensitivity_metrics": {
                "max_sensitivity_point": 0.22,
                "curve_steepness": 0.045,
                "risk_return_ratio": 1.23,
                "portfolio_beta": 0.89,
                "var_95": 0.0234,
                "expected_shortfall": 0.0312
            }
        },
        "noira_analysis": {
            "analysis_id": "analysis-20240115-143022",
            "messages": [
                {
                    "role": "assistant",
                    "content": "Analysis complete for AAPL volatility sensitivity. The portfolio shows moderate sensitivity to volatility changes in AAPL, with the most significant impact occurring at 22% volatility.",
                    "timestamp": "2024-01-15T14:30:25Z"
                }
            ]
        }
    }
    
    try:
        test_run_id = file_manager.save_test_run(project_config['metadata']['project_id'], test_run_data)
        print(f"✅ Created test run: {test_run_id}")
    except Exception as e:
        print(f"❌ Failed to create test run: {e}")
        return
    
    # Test 5: Load test run
    print("\n5. Loading test run...")
    loaded_test_run = file_manager.load_test_run(test_run_id)
    if loaded_test_run:
        print(f"✅ Loaded test run: {loaded_test_run['test_run_id']}")
        print(f"   Block type: {loaded_test_run['block_type']}")
        print(f"   Results count: {len(loaded_test_run['results']['results'])}")
        print(f"   Analytics mode: {loaded_test_run['analytics']['mode']}")
    else:
        print("❌ Failed to load test run")
    
    # Test 6: List test runs
    print("\n6. Listing test runs...")
    test_runs = file_manager.list_test_runs()
    print(f"✅ Found {len(test_runs)} test runs:")
    for test_run in test_runs:
        print(f"   - {test_run['test_run_id']} ({test_run['block_type']})")
    
    # Test 7: Update project with test run
    print("\n7. Updating project with test run...")
    success = file_manager.update_project_test_runs("Test Project Alpha", test_run_id)
    if success:
        print("✅ Updated project with test run")
    else:
        print("❌ Failed to update project with test run")
    
    # Test 8: Get complete project state
    print("\n8. Getting complete project state...")
    project_state = file_manager.get_project_state("Test Project Alpha")
    if project_state:
        print(f"✅ Got project state:")
        print(f"   Project: {project_state['project_config']['metadata']['name']}")
        print(f"   Test runs: {len(project_state['test_runs'])}")
        print(f"   Current tab: {project_state['project_config']['results']['current_tab']}")
    else:
        print("❌ Failed to get project state")
    
    # Test 9: Save project state
    print("\n9. Saving project state...")
    if project_state:
        # Modify the project state
        project_state['project_config']['configuration']['blocks']['classical']['placed'] = True
        project_state['project_config']['configuration']['blocks']['classical']['position'] = {"x": 200, "y": 150}
        project_state['project_config']['configuration']['blocks']['classical']['parameters'] = test_run_data['parameters']
        
        success = file_manager.save_project_state("Test Project Alpha", project_state)
        if success:
            print("✅ Saved updated project state")
        else:
            print("❌ Failed to save project state")
    
    # Test 10: Create another project
    print("\n10. Creating another project...")
    try:
        project_config2 = file_manager.create_project("Test Project Beta")
        print(f"✅ Created second project: {project_config2['metadata']['name']}")
    except Exception as e:
        print(f"❌ Failed to create second project: {e}")
    
    # Test 11: List all projects again
    print("\n11. Listing all projects...")
    projects = file_manager.list_projects()
    print(f"✅ Found {len(projects)} projects:")
    for project in projects:
        print(f"   - {project['name']} (ID: {project['project_id']})")
    
    print("\n" + "=" * 50)
    print("File manager test completed!")
    print("\nGenerated files:")
    print(f"   Projects directory: {file_manager.projects_dir}")
    print(f"   Test runs directory: {file_manager.test_runs_dir}")
    print("\nYou can inspect the generated .ksm and .json files to see the structure.")

if __name__ == "__main__":
    test_file_manager() 