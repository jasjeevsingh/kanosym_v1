"""
file_manager.py

File management module for KANOSYM project files (.ksm) and test run output files.
Handles reading, writing, and managing project state and test results.
"""

import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class FileManager:
    """Manages .ksm project files and test run output files"""
    
    def __init__(self, base_dir: str = None):
        """
        Initialize file manager with base directory.
        
        Args:
            base_dir: Base directory for projects and test runs. 
                     Defaults to backend directory.
        """
        if base_dir is None:
            # Default to backend directory
            self.base_dir = Path(__file__).parent
        else:
            self.base_dir = Path(base_dir)
        
        # Create directories if they don't exist
        self.projects_dir = self.base_dir / "projects"
        self.test_runs_dir = self.base_dir / "test-runs"
        
        self.projects_dir.mkdir(exist_ok=True)
        self.test_runs_dir.mkdir(exist_ok=True)
        
        logger.info(f"FileManager initialized with base_dir: {self.base_dir}")
        logger.info(f"Projects directory: {self.projects_dir}")
        logger.info(f"Test runs directory: {self.test_runs_dir}")
    
    def create_project(self, name: str, project_id: str = None) -> Dict[str, Any]:
        """
        Create a new project folder and .ksm file inside it.
        Args:
            name: Project name
            project_id: Optional project ID (generated if not provided)
        Returns:
            Project configuration dictionary
        """
        if project_id is None:
            project_id = f"proj-{int(datetime.now().timestamp())}"
        now = datetime.now().isoformat()
        project_config = {
            "version": "1.0.0",
            "metadata": {
                "project_id": project_id,
                "name": name,
                "created": now,
                "last_modified": now,
                "description": f"Portfolio sensitivity analysis project: {name}"
            },
            "configuration": {
                "blocks": {
                    "classical": {"placed": False, "position": None, "parameters": None},
                    "hybrid": {"placed": False, "position": None, "parameters": None},
                    "quantum": {"placed": False, "position": None, "parameters": None}
                },
                "ui_state": {"current_block_mode": "classical", "selected_block": None, "block_move_count": 0}
            },
            "results": {"test_runs": [], "current_tab": None}
        }
        # Create project folder
        project_folder = self.projects_dir / name
        project_folder.mkdir(exist_ok=True)
        # Save project file inside folder
        filename = f"{name}.ksm"
        filepath = project_folder / filename
        try:
            with open(filepath, 'w') as f:
                json.dump(project_config, f, indent=2)
            logger.info(f"Created project file: {filepath}")
            return project_config
        except Exception as e:
            logger.error(f"Failed to create project file {filepath}: {e}")
            raise

    def load_project(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Load a project file (.ksm) from its folder.
        Args:
            name: Project name (without .ksm extension)
        Returns:
            Project configuration dictionary or None if not found
        """
        project_folder = self.projects_dir / name
        filename = f"{name}.ksm"
        filepath = project_folder / filename
        try:
            if not filepath.exists():
                logger.warning(f"Project file not found: {filepath}")
                return None
            with open(filepath, 'r') as f:
                project_config = json.load(f)
            logger.debug(f"Loaded project file: {filepath}")
            return project_config
        except Exception as e:
            logger.error(f"Failed to load project file {filepath}: {e}")
            return None

    def save_project(self, name: str, project_config: Dict[str, Any]) -> bool:
        """
        Save a project file (.ksm) inside its folder.
        Args:
            name: Project name (without .ksm extension)
            project_config: Project configuration dictionary
        Returns:
            True if successful, False otherwise
        """
        project_folder = self.projects_dir / name
        filename = f"{name}.ksm"
        filepath = project_folder / filename
        try:
            # Update last_modified timestamp
            project_config["metadata"]["last_modified"] = datetime.now().isoformat()
            with open(filepath, 'w') as f:
                json.dump(project_config, f, indent=2)
            logger.info(f"Saved project file: {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to save project file {filepath}: {e}")
            return False

    def delete_project(self, name: str) -> bool:
        """
        Delete a project folder and its .ksm file.
        Args:
            name: Project name (without .ksm extension)
        Returns:
            True if successful, False otherwise
        """
        project_folder = self.projects_dir / name
        filename = f"{name}.ksm"
        filepath = project_folder / filename
        try:
            if filepath.exists():
                filepath.unlink()
            # Remove the folder if empty
            if project_folder.exists() and not any(project_folder.iterdir()):
                project_folder.rmdir()
            logger.info(f"Deleted project file and folder: {filepath}, {project_folder}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete project file or folder {filepath}: {e}")
            return False

    def list_projects(self) -> List[Dict[str, Any]]:
        """
        List all available projects (folders with .ksm files inside).
        Returns:
            List of project metadata dictionaries
        """
        projects = []
        try:
            for project_folder in self.projects_dir.iterdir():
                if project_folder.is_dir():
                    ksm_file = project_folder / f"{project_folder.name}.ksm"
                    if ksm_file.exists():
                        try:
                            with open(ksm_file, 'r') as f:
                                project_config = json.load(f)
                            projects.append({
                                "name": project_folder.name,
                                "project_id": project_config["metadata"]["project_id"],
                                "created": project_config["metadata"]["created"],
                                "last_modified": project_config["metadata"]["last_modified"],
                                "description": project_config["metadata"]["description"]
                            })
                        except Exception as e:
                            logger.error(f"Failed to read project file {ksm_file}: {e}")
                            continue
            logger.debug(f"Found {len(projects)} projects")
            return projects
        except Exception as e:
            logger.error(f"Failed to list projects: {e}")
            return []
    
    def save_test_run(self, project_id: str, test_run_data: Dict[str, Any]) -> str:
        """
        Save a test run output file.
        
        Args:
            project_id: ID of the project this test run belongs to
            test_run_data: Test run data dictionary
            
        Returns:
            Test run ID
        """
        # Generate test run ID
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        test_run_id = f"test-run-{timestamp}"
        
        # Add metadata
        test_run_data["test_run_id"] = test_run_id
        test_run_data["timestamp"] = datetime.now().isoformat()
        test_run_data["project_id"] = project_id
        
        # Save test run file
        filename = f"{test_run_id}.json"
        filepath = self.test_runs_dir / filename
        
        try:
            with open(filepath, 'w') as f:
                json.dump(test_run_data, f, indent=2)
            
            logger.info(f"Saved test run file: {filepath}")
            return test_run_id
            
        except Exception as e:
            logger.error(f"Failed to save test run file {filepath}: {e}")
            raise
    
    def load_test_run(self, test_run_id: str) -> Optional[Dict[str, Any]]:
        """
        Load a test run output file.
        
        Args:
            test_run_id: ID of the test run to load
            
        Returns:
            Test run data dictionary or None if not found
        """
        filename = f"{test_run_id}.json"
        filepath = self.test_runs_dir / filename
        
        try:
            if not filepath.exists():
                logger.warning(f"Test run file not found: {filepath}")
                return None
            
            with open(filepath, 'r') as f:
                test_run_data = json.load(f)
            
            logger.info(f"Loaded test run file: {filepath}")
            return test_run_data
            
        except Exception as e:
            logger.error(f"Failed to load test run file {filepath}: {e}")
            return None
    
    def delete_test_run(self, test_run_id: str) -> bool:
        """
        Delete a test run output file.
        
        Args:
            test_run_id: ID of the test run to delete
            
        Returns:
            True if successful, False otherwise
        """
        filename = f"{test_run_id}.json"
        filepath = self.test_runs_dir / filename
        
        try:
            if filepath.exists():
                filepath.unlink()
                logger.info(f"Deleted test run file: {filepath}")
                return True
            else:
                logger.warning(f"Test run file not found for deletion: {filepath}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to delete test run file {filepath}: {e}")
            return False
    
    def list_test_runs(self, project_id: str = None) -> List[Dict[str, Any]]:
        """
        List all test run files, optionally filtered by project.
        
        Args:
            project_id: Optional project ID to filter by
            
        Returns:
            List of test run metadata dictionaries
        """
        test_runs = []
        
        try:
            for filepath in self.test_runs_dir.glob("*.json"):
                try:
                    with open(filepath, 'r') as f:
                        test_run_data = json.load(f)
                    
                    # Filter by project if specified
                    if project_id and test_run_data.get("project_id") != project_id:
                        continue
                    
                    test_runs.append({
                        "test_run_id": test_run_data["test_run_id"],
                        "project_id": test_run_data.get("project_id"),
                        "timestamp": test_run_data["timestamp"],
                        "block_type": test_run_data["block_type"],
                        "parameters": test_run_data["parameters"]
                    })
                    
                except Exception as e:
                    logger.error(f"Failed to read test run file {filepath}: {e}")
                    continue
            
            # Sort by timestamp (newest first)
            test_runs.sort(key=lambda x: x["timestamp"], reverse=True)
            
            logger.info(f"Found {len(test_runs)} test runs")
            return test_runs
            
        except Exception as e:
            logger.error(f"Failed to list test runs: {e}")
            return []
    
    def update_project_test_runs(self, project_name: str, test_run_id: str) -> bool:
        """
        Update a project's test runs list with a new test run.
        
        Args:
            project_name: Name of the project
            test_run_id: ID of the test run to add
            
        Returns:
            True if successful, False otherwise
        """
        project_config = self.load_project(project_name)
        if not project_config:
            return False
        
        # Add test run to project's test runs list
        test_run_info = {
            "id": test_run_id,
            "timestamp": datetime.now().isoformat(),
            "block_type": "classical",  # This should come from the test run data
            "parameters": {},  # This should come from the test run data
            "results_file": f"test-runs/{test_run_id}.json"
        }
        
        project_config["results"]["test_runs"].append(test_run_info)
        project_config["results"]["current_tab"] = test_run_id
        
        return self.save_project(project_name, project_config)
    
    def get_project_state(self, project_name: str) -> Optional[Dict[str, Any]]:
        """
        Get the current state of a project including all test runs.
        
        Args:
            project_name: Name of the project
            
        Returns:
            Complete project state dictionary or None if not found
        """
        project_config = self.load_project(project_name)
        if not project_config:
            return None
        
        # Load all test runs for this project
        test_runs = []
        for test_run_info in project_config["results"]["test_runs"]:
            test_run_id = test_run_info["id"]
            test_run_data = self.load_test_run(test_run_id)
            if test_run_data:
                test_runs.append(test_run_data)
        
        # Create complete state
        project_state = {
            "project_config": project_config,
            "test_runs": test_runs
        }
        
        return project_state
    
    def save_project_state(self, project_name: str, project_state: Dict[str, Any]) -> bool:
        """
        Save the complete state of a project.
        
        Args:
            project_name: Name of the project
            project_state: Complete project state dictionary
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Save project configuration
            project_config = project_state["project_config"]
            if not self.save_project(project_name, project_config):
                return False
            
            # Save test runs
            for test_run_data in project_state.get("test_runs", []):
                test_run_id = test_run_data["test_run_id"]
                self.save_test_run(project_config["metadata"]["project_id"], test_run_data)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to save project state for {project_name}: {e}")
            return False 

    def rename_project(self, old_name: str, new_name: str) -> bool:
        """
        Rename a project file (.ksm) and update the project name in metadata.
        Args:
            old_name: Current project name (without .ksm)
            new_name: New project name (without .ksm)
        Returns:
            True if successful, False otherwise
        """
        old_filename = f"{old_name}.ksm"
        new_filename = f"{new_name}.ksm"
        old_filepath = self.projects_dir / old_name / old_filename
        new_filepath = self.projects_dir / new_name / new_filename
        try:
            if not old_filepath.exists():
                logger.warning(f"Project file not found for renaming: {old_filepath}")
                return False
            # Load project config
            with open(old_filepath, 'r') as f:
                project_config = json.load(f)
            # Update name in metadata
            project_config["metadata"]["name"] = new_name
            project_config["metadata"]["last_modified"] = datetime.now().isoformat()
            # Save to new file
            with open(new_filepath, 'w') as f:
                json.dump(project_config, f, indent=2)
            # Remove old file
            old_filepath.unlink()
            logger.info(f"Renamed project file: {old_filepath} -> {new_filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to rename project file {old_filepath} to {new_filepath}: {e}")
            return False 