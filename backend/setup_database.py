"""
setup_database.py

Database setup and migration script for KANOSYM.
Helps initialize PostgreSQL database and migrate existing file-based data.
"""

import os
import sys
import json
import logging
from pathlib import Path
from database import DatabaseManager
from file_manager import FileManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_database():
    """Initialize database and create tables"""
    try:
        db_manager = DatabaseManager()
        logger.info("Database setup completed successfully")
        return db_manager
    except Exception as e:
        logger.error(f"Database setup failed: {e}")
        return None

def migrate_existing_projects():
    """Migrate existing .ksm project files to database"""
    file_manager = FileManager()
    db_manager = DatabaseManager()
    
    # Get existing projects
    existing_projects = file_manager.list_projects()
    logger.info(f"Found {len(existing_projects)} existing projects to migrate")
    
    migrated_count = 0
    for project_info in existing_projects:
        try:
            # Load project data from file
            project_config = file_manager.load_project(project_info['name'])
            if not project_config:
                logger.warning(f"Could not load project: {project_info['name']}")
                continue
            
            # Check if project already exists in database
            existing_db_project = db_manager.get_project_by_name(project_info['name'])
            if existing_db_project:
                logger.info(f"Project {project_info['name']} already exists in database, skipping")
                continue
            
            # Create project in database
            project_id = db_manager.create_project(
                name=project_info['name'],
                description=project_info['description']
            )
            
            # Save project state
            if 'configuration' in project_config:
                db_manager.save_project_state(project_id, project_config['configuration'])
            
            # Migrate test runs
            if 'results' in project_config and 'test_runs' in project_config['results']:
                for test_run_id in project_config['results']['test_runs']:
                    test_run_data = file_manager.load_test_run(test_run_id)
                    if test_run_data:
                        migrate_test_run(db_manager, project_id, test_run_id, test_run_data)
            
            migrated_count += 1
            logger.info(f"Migrated project: {project_info['name']}")
            
        except Exception as e:
            logger.error(f"Failed to migrate project {project_info['name']}: {e}")
    
    logger.info(f"Migration completed. {migrated_count} projects migrated successfully")

def migrate_test_run(db_manager, project_id, test_run_id, test_run_data):
    """Migrate a single test run to database"""
    try:
        # Extract test run metadata
        test_run_meta = {
            'test_type': test_run_data.get('processing_mode', 'classical'),
            'parameter_type': test_run_data.get('perturbation', 'volatility'),
            'asset_name': test_run_data.get('asset', ''),
            'range_min': test_run_data.get('range_tested', [0, 1])[0],
            'range_max': test_run_data.get('range_tested', [0, 1])[1],
            'steps': len(test_run_data.get('results', [])),
            'baseline_volatility_daily': test_run_data.get('baseline_portfolio_volatility_daily'),
            'baseline_volatility_annualized': test_run_data.get('baseline_portfolio_volatility_annualized'),
            'status': 'completed'
        }
        
        # Create test run in database
        db_test_run_id = db_manager.create_test_run(project_id, test_run_meta)
        
        # Save test results
        results = test_run_data.get('results', [])
        if results:
            db_manager.save_test_results(db_test_run_id, results)
        
        # Save analytics
        analytics = test_run_data.get('analytics', {})
        if analytics:
            db_manager.save_analytics_metrics(db_test_run_id, analytics)
        
        logger.info(f"Migrated test run: {test_run_id} -> {db_test_run_id}")
        
    except Exception as e:
        logger.error(f"Failed to migrate test run {test_run_id}: {e}")

def create_sample_project():
    """Create a sample project for testing"""
    db_manager = DatabaseManager()
    
    # Create sample project
    project_id = db_manager.create_project(
        name="Sample Portfolio",
        description="A sample portfolio for testing KANOSYM functionality"
    )
    
    # Create sample project state
    sample_state = {
        "blocks": {
            "classical": {"placed": False, "position": None, "parameters": None},
            "hybrid": {"placed": False, "position": None, "parameters": None},
            "quantum": {"placed": False, "position": None, "parameters": None}
        },
        "ui_state": {
            "current_block_mode": "classical",
            "selected_block": None,
            "block_move_count": 0
        }
    }
    
    db_manager.save_project_state(project_id, sample_state)
    logger.info(f"Created sample project with ID: {project_id}")

def main():
    """Main setup function"""
    print("KANOSYM Database Setup")
    print("=" * 50)
    
    # Check if database connection is available
    try:
        db_manager = setup_database()
        if not db_manager:
            print("❌ Database setup failed. Please check your PostgreSQL connection.")
            return
        
        print("✅ Database setup completed successfully")
        
        # Ask user what to do
        print("\nOptions:")
        print("1. Migrate existing projects from files")
        print("2. Create sample project")
        print("3. Both")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice in ['1', '3']:
            print("\nMigrating existing projects...")
            migrate_existing_projects()
        
        if choice in ['2', '3']:
            print("\nCreating sample project...")
            create_sample_project()
        
        if choice == '4':
            print("Setup completed.")
            return
        
        print("\n✅ Database setup and migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        print("\nPlease ensure:")
        print("1. PostgreSQL is running")
        print("2. Database 'kanosym' exists")
        print("3. Environment variables are set (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)")

if __name__ == "__main__":
    main() 