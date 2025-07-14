"""
test_database.py

Test script to verify database integration for KANOSYM.
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from database import DatabaseManager
import json

def test_database_connection():
    """Test basic database connection and table creation"""
    print("Testing database connection...")
    try:
        db_manager = DatabaseManager()
        print("✅ Database connection successful")
        return db_manager
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return None

def test_project_operations(db_manager):
    """Test project CRUD operations"""
    print("\nTesting project operations...")
    
    try:
        # Create a test project
        project_id = db_manager.create_project(
            name="Test Project",
            description="A test project for database verification"
        )
        print(f"✅ Created project with ID: {project_id}")
        
        # Get the project
        project = db_manager.get_project(project_id)
        if project:
            print(f"✅ Retrieved project: {project['name']}")
        else:
            print("❌ Failed to retrieve project")
            return False
        
        # List projects
        projects = db_manager.list_projects()
        print(f"✅ Listed {len(projects)} projects")
        
        # Update project
        success = db_manager.update_project(project_id, description="Updated test project")
        if success:
            print("✅ Updated project successfully")
        else:
            print("❌ Failed to update project")
        
        return project_id
        
    except Exception as e:
        print(f"❌ Project operations failed: {e}")
        return None

def test_project_state_operations(db_manager, project_id):
    """Test project state operations"""
    print("\nTesting project state operations...")
    
    try:
        # Create test state
        test_state = {
            "blocks": {
                "classical": {"placed": True, "position": {"x": 100, "y": 100}, "parameters": {"test": "data"}},
                "hybrid": {"placed": False, "position": None, "parameters": None},
                "quantum": {"placed": False, "position": None, "parameters": None}
            },
            "ui_state": {
                "current_block_mode": "classical",
                "selected_block": "classical",
                "block_move_count": 1
            }
        }
        
        # Save state
        state_id = db_manager.save_project_state(project_id, test_state)
        print(f"✅ Saved project state with ID: {state_id}")
        
        # Get state
        retrieved_state = db_manager.get_project_state(project_id)
        if retrieved_state:
            print("✅ Retrieved project state successfully")
            print(f"   State data keys: {list(retrieved_state['state_data'].keys())}")
        else:
            print("❌ Failed to retrieve project state")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Project state operations failed: {e}")
        return False

def test_test_run_operations(db_manager, project_id):
    """Test test run operations"""
    print("\nTesting test run operations...")
    
    try:
        # Create test run
        test_run_data = {
            'test_type': 'classical',
            'parameter_type': 'volatility',
            'asset_name': 'AAPL',
            'range_min': 0.1,
            'range_max': 0.3,
            'steps': 10,
            'baseline_volatility_daily': 0.15,
            'baseline_volatility_annualized': 0.24,
            'execution_time_seconds': 2.5,
            'status': 'completed'
        }
        
        test_run_id = db_manager.create_test_run(project_id, test_run_data)
        print(f"✅ Created test run with ID: {test_run_id}")
        
        # Create test results
        test_results = [
            {
                'perturbed_value': 0.1,
                'portfolio_volatility_daily': 0.12,
                'portfolio_volatility_annualized': 0.19,
                'delta_vs_baseline': -0.03,
                'step_order': 0
            },
            {
                'perturbed_value': 0.2,
                'portfolio_volatility_daily': 0.18,
                'portfolio_volatility_annualized': 0.29,
                'delta_vs_baseline': 0.03,
                'step_order': 1
            }
        ]
        
        success = db_manager.save_test_results(test_run_id, test_results)
        if success:
            print("✅ Saved test results successfully")
        else:
            print("❌ Failed to save test results")
        
        # Save analytics
        test_analytics = {
            'performance_metrics': {
                'total_execution_time': 2.5,
                'throughput': 4.0,
                'steps_processed': 10
            },
            'statistical_metrics': {
                'confidence_interval_95': [0.12, 0.18],
                'coefficient_of_variation': 0.15
            }
        }
        
        success = db_manager.save_analytics_metrics(test_run_id, test_analytics)
        if success:
            print("✅ Saved analytics metrics successfully")
        else:
            print("❌ Failed to save analytics metrics")
        
        # Get complete test run
        test_run = db_manager.get_test_run(test_run_id)
        if test_run:
            print("✅ Retrieved complete test run successfully")
            print(f"   Results count: {len(test_run['results'])}")
            print(f"   Analytics keys: {list(test_run['analytics'].keys())}")
        else:
            print("❌ Failed to retrieve test run")
        
        return test_run_id
        
    except Exception as e:
        print(f"❌ Test run operations failed: {e}")
        return None

def test_listing_operations(db_manager, project_id):
    """Test listing operations"""
    print("\nTesting listing operations...")
    
    try:
        # List test runs for project
        test_runs = db_manager.list_test_runs(project_id)
        print(f"✅ Listed {len(test_runs)} test runs for project")
        
        # List all test runs
        all_test_runs = db_manager.list_test_runs()
        print(f"✅ Listed {len(all_test_runs)} total test runs")
        
        return True
        
    except Exception as e:
        print(f"❌ Listing operations failed: {e}")
        return False

def cleanup_test_data(db_manager, project_id, test_run_id):
    """Clean up test data"""
    print("\nCleaning up test data...")
    
    try:
        # Delete test run (this will cascade delete results and analytics)
        if test_run_id:
            success = db_manager.delete_test_run(test_run_id)
            if success:
                print("✅ Deleted test run")
            else:
                print("❌ Failed to delete test run")
        
        # Delete project (this will cascade delete states)
        if project_id:
            success = db_manager.delete_project(project_id)
            if success:
                print("✅ Deleted test project")
            else:
                print("❌ Failed to delete test project")
        
        return True
        
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        return False

def main():
    """Run all database tests"""
    print("KANOSYM Database Integration Test")
    print("=" * 50)
    
    # Test database connection
    db_manager = test_database_connection()
    if not db_manager:
        print("\n❌ Database tests failed - cannot connect to database")
        return
    
    # Test project operations
    project_id = test_project_operations(db_manager)
    if not project_id:
        print("\n❌ Database tests failed - project operations failed")
        return
    
    # Test project state operations
    state_success = test_project_state_operations(db_manager, project_id)
    if not state_success:
        print("\n❌ Database tests failed - project state operations failed")
        cleanup_test_data(db_manager, project_id, None)
        return
    
    # Test test run operations
    test_run_id = test_test_run_operations(db_manager, project_id)
    if not test_run_id:
        print("\n❌ Database tests failed - test run operations failed")
        cleanup_test_data(db_manager, project_id, None)
        return
    
    # Test listing operations
    listing_success = test_listing_operations(db_manager, project_id)
    if not listing_success:
        print("\n❌ Database tests failed - listing operations failed")
        cleanup_test_data(db_manager, project_id, test_run_id)
        return
    
    # Cleanup
    cleanup_success = cleanup_test_data(db_manager, project_id, test_run_id)
    
    print("\n" + "=" * 50)
    if cleanup_success:
        print("✅ All database tests passed successfully!")
        print("\nThe database integration is working correctly.")
        print("You can now start the KANOSYM application with database persistence.")
    else:
        print("⚠️  Tests passed but cleanup failed")
        print("Check the database for any remaining test data.")

if __name__ == "__main__":
    main() 