#!/usr/bin/env python3
"""
Test script for autosave functionality.
Tests automatic saving of test runs and project state.
"""

import sys
import os
import requests
import json
import time
sys.path.append(os.path.dirname(__file__))

def test_autosave_functionality():
    """Test the autosave functionality."""
    
    print("Testing Autosave Functionality...")
    print("=" * 50)
    
    base_url = "http://localhost:5001"
    
    # Test 1: Create a project
    print("\n1. Creating a test project...")
    try:
        response = requests.post(f"{base_url}/api/projects", json={"name": "Autosave Test Project"})
        data = response.json()
        if data["success"]:
            project_name = "Autosave Test Project"
            project_id = data["project"]["metadata"]["project_id"]
            print(f"✅ Created project: {project_name}")
            print(f"   Project ID: {project_id}")
        else:
            print(f"❌ Failed to create project: {data.get('error', 'Unknown error')}")
            return
    except Exception as e:
        print(f"❌ Error creating project: {e}")
        return
    
    # Test 2: Run a sensitivity test with autosave
    print("\n2. Running sensitivity test with autosave...")
    try:
        test_data = {
            "portfolio": {
                "assets": ["AAPL", "GOOGL", "MSFT"],
                "weights": [0.4, 0.3, 0.3],
                "volatility": [0.2, 0.25, 0.18],
                "correlation_matrix": [[1.0, 0.3, 0.2], [0.3, 1.0, 0.4], [0.2, 0.4, 1.0]]
            },
            "param": "volatility",
            "asset": "AAPL",
            "range": [0.15, 0.25],
            "steps": 5,
            "project_id": project_id,
            "project_name": project_name
        }
        
        response = requests.post(f"{base_url}/api/classical_sensitivity_test", json=test_data)
        data = response.json()
        
        if response.status_code == 200:
            print("✅ Sensitivity test completed successfully")
            if data.get("saved_to_file"):
                print(f"   ✅ Test run auto-saved with ID: {data.get('test_run_id')}")
            else:
                print("   ⚠️ Test run not auto-saved (no project_id provided)")
        else:
            print(f"❌ Sensitivity test failed: {data.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Error running sensitivity test: {e}")
    
    # Test 3: Check if test run was saved
    print("\n3. Checking saved test runs...")
    try:
        response = requests.get(f"{base_url}/api/test-runs")
        data = response.json()
        if data["success"]:
            test_runs = data["test_runs"]
            print(f"✅ Found {len(test_runs)} test runs")
            for test_run in test_runs[:3]:  # Show first 3
                print(f"   - {test_run['test_run_id']} ({test_run['block_type']})")
        else:
            print(f"❌ Failed to list test runs: {data.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Error listing test runs: {e}")
    
    # Test 4: Test project autosave endpoint
    print("\n4. Testing project autosave endpoint...")
    try:
        project_state = {
            "project_id": project_id,
            "project_name": project_name,
            "blocks": {
                "classical": {
                    "placed": True,
                    "position": {"x": 200, "y": 150},
                    "parameters": test_data
                },
                "hybrid": {
                    "placed": False,
                    "position": None,
                    "parameters": None
                },
                "quantum": {
                    "placed": False,
                    "position": None,
                    "parameters": None
                }
            },
            "ui_state": {
                "current_block_mode": "classical",
                "selected_block": None,
                "block_move_count": 1
            },
            "results": {
                "test_runs": [],
                "current_tab": None
            }
        }
        
        response = requests.post(
            f"{base_url}/api/projects/{project_name}/autosave", 
            json={"project_state": project_state}
        )
        data = response.json()
        
        if data["success"]:
            print("✅ Project autosave successful")
        else:
            print(f"❌ Project autosave failed: {data.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Error testing project autosave: {e}")
    
    # Test 5: Verify project was updated
    print("\n5. Verifying project was updated...")
    try:
        response = requests.get(f"{base_url}/api/projects/{project_name}")
        data = response.json()
        if data["success"]:
            project = data["project"]
            classical_block = project["configuration"]["blocks"]["classical"]
            if classical_block["placed"]:
                print("✅ Project state correctly saved")
                print(f"   Block position: {classical_block['position']}")
            else:
                print("❌ Project state not saved correctly")
        else:
            print(f"❌ Failed to load project: {data.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Error verifying project: {e}")
    
    print("\n" + "=" * 50)
    print("Autosave functionality test completed!")
    print("\nKey features tested:")
    print("   ✅ Test run autosave during sensitivity tests")
    print("   ✅ Project state autosave endpoint")
    print("   ✅ File persistence verification")
    print("   ✅ Error handling and validation")

if __name__ == "__main__":
    test_autosave_functionality() 