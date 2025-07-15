"""
file_access_service.py

Service for Noira to access project and test run files.
Provides structured data retrieval and formatting for AI analysis.
"""

import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta, date
from pathlib import Path

logger = logging.getLogger(__name__)


class NoiraFileAccessService:
    """Service for accessing and formatting file data for Noira"""
    
    def __init__(self, file_manager):
        """
        Initialize the file access service.
        
        Args:
            file_manager: Instance of FileManager for file operations
        """
        self.file_manager = file_manager
    
    def execute_tool_call(self, tool_name: str, arguments: dict) -> dict:
        """
        Execute a tool call and return results.
        
        Args:
            tool_name: Name of the tool to execute
            arguments: Arguments for the tool
            
        Returns:
            Dictionary with success status and data/error
        """
        try:
            logger.info(f"🔧 Executing tool: {tool_name} with args: {arguments}")
            
            if tool_name == "load_project":
                return self._handle_load_project(arguments)
            
            elif tool_name == "load_test_run":
                return self._handle_load_test_run(arguments)
            
            elif tool_name == "search_test_runs":
                return self._handle_search_test_runs(arguments)
            
            elif tool_name == "list_projects":
                return self._handle_list_projects(arguments)
            
            else:
                return {
                    "success": False,
                    "error": f"Unknown tool: {tool_name}"
                }
                
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {str(e)}")
            return {
                "success": False,
                "error": f"Error executing tool: {str(e)}"
            }
    
    def _handle_load_project(self, arguments: dict) -> dict:
        """Handle load_project tool call"""
        project_name = arguments.get("project_name")
        if not project_name:
            return {"success": False, "error": "project_name is required"}
        
        # Try case-insensitive matching
        projects = self.file_manager.list_projects()
        matching_project = None
        for project in projects:
            if project["name"].lower() == project_name.lower():
                matching_project = project["name"]
                break
        
        if not matching_project:
            return {
                "success": False,
                "error": f"Project '{project_name}' not found. Available projects: {', '.join([p['name'] for p in projects])}"
            }
        
        # Load the project
        project_data = self.file_manager.load_project(matching_project)
        if not project_data:
            return {"success": False, "error": f"Failed to load project '{matching_project}'"}
        
        # Format the data for Noira
        formatted_data = self._format_project_data(project_data)
        
        return {
            "success": True,
            "data": formatted_data,
            "summary": f"Loaded project '{matching_project}' (ID: {formatted_data['project_id']})"
        }
    
    def _handle_load_test_run(self, arguments: dict) -> dict:
        """Handle load_test_run tool call"""
        test_run_id = arguments.get("test_run_id")
        if not test_run_id:
            return {"success": False, "error": "test_run_id is required"}
        
        test_run_data = self.file_manager.load_test_run(test_run_id)
        if not test_run_data:
            return {"success": False, "error": f"Test run '{test_run_id}' not found"}
        
        # Format the data for Noira
        formatted_data = self._format_test_run_data(test_run_data)
        
        return {
            "success": True,
            "data": formatted_data,
            "summary": f"Loaded test run {test_run_id} ({formatted_data['block_type']} - {formatted_data['asset']})"
        }
    
    def _handle_search_test_runs(self, arguments: dict) -> dict:
        """Handle search_test_runs tool call"""
        date_filter = arguments.get("date_filter")
        limit = arguments.get("limit", 10)
        
        # Get all test runs
        all_test_runs = self.file_manager.list_test_runs()
        
        # Apply date filtering
        filtered_runs = self._filter_test_runs_by_date(all_test_runs, date_filter, arguments)
        
        # Apply additional filters
        if arguments.get("project_filter"):
            project_filter = arguments["project_filter"].lower()
            filtered_runs = [tr for tr in filtered_runs if project_filter in tr.get("project_id", "").lower()]
        
        if arguments.get("asset_filter"):
            asset_filter = arguments["asset_filter"].upper()
            filtered_runs = [tr for tr in filtered_runs if tr.get("parameters", {}).get("asset") == asset_filter]
        
        if arguments.get("block_type_filter"):
            filtered_runs = [tr for tr in filtered_runs if tr.get("block_type") == arguments["block_type_filter"]]
        
        # Limit results
        filtered_runs = filtered_runs[:limit]
        
        # Load full data for each test run
        results = []
        for tr in filtered_runs:
            full_data = self.file_manager.load_test_run(tr["test_run_id"])
            if full_data:
                results.append(self._format_test_run_data(full_data))
        
        return {
            "success": True,
            "data": results,
            "summary": f"Found {len(results)} test runs matching criteria"
        }
    
    def _handle_list_projects(self, arguments: dict) -> dict:
        """Handle list_projects tool call"""
        sort_by = arguments.get("sort_by", "last_modified")
        ascending = arguments.get("ascending", False)
        
        projects = self.file_manager.list_projects()
        
        # Sort projects
        if sort_by in ["name", "created", "last_modified"]:
            projects.sort(key=lambda p: p[sort_by], reverse=not ascending)
        
        # Format project list
        formatted_projects = []
        for project in projects:
            formatted_projects.append({
                "name": project["name"],
                "project_id": project["project_id"],
                "created": project["created"],
                "last_modified": project["last_modified"],
                "description": project.get("description", "")
            })
        
        return {
            "success": True,
            "data": formatted_projects,
            "summary": f"Found {len(formatted_projects)} projects"
        }
    
    def _filter_test_runs_by_date(self, test_runs: List[Dict], date_filter: str, arguments: dict) -> List[Dict]:
        """Filter test runs by date criteria"""
        today = date.today()
        
        if date_filter == "today":
            start_date = today
            end_date = today
        elif date_filter == "yesterday":
            start_date = today - timedelta(days=1)
            end_date = start_date
        elif date_filter == "this_week":
            start_date = today - timedelta(days=today.weekday())
            end_date = today
        elif date_filter == "last_week":
            start_date = today - timedelta(days=today.weekday() + 7)
            end_date = start_date + timedelta(days=6)
        elif date_filter == "last_month":
            start_date = today - timedelta(days=30)
            end_date = today
        elif date_filter == "specific_date":
            specific_date = arguments.get("specific_date")
            if specific_date:
                start_date = datetime.strptime(specific_date, "%Y-%m-%d").date()
                end_date = start_date
            else:
                return test_runs  # No valid date provided
        elif date_filter == "date_range":
            start_str = arguments.get("start_date")
            end_str = arguments.get("end_date")
            if start_str and end_str:
                start_date = datetime.strptime(start_str, "%Y-%m-%d").date()
                end_date = datetime.strptime(end_str, "%Y-%m-%d").date()
            else:
                return test_runs  # No valid range provided
        elif date_filter == "recent":
            # Just return all, sorted by date (newest first)
            return sorted(test_runs, key=lambda x: x["timestamp"], reverse=True)
        else:
            return test_runs
        
        # Filter by date range
        filtered = []
        for tr in test_runs:
            tr_date = datetime.fromisoformat(tr["timestamp"]).date()
            if start_date <= tr_date <= end_date:
                filtered.append(tr)
        
        return sorted(filtered, key=lambda x: x["timestamp"], reverse=True)
    
    def _format_project_data(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format project data for Noira's consumption"""
        metadata = project_data.get("metadata", {})
        config = project_data.get("configuration", {})
        blocks = config.get("blocks", {})
        
        # Determine which blocks are placed
        blocks_placed = []
        block_details = {}
        for block_type, block_info in blocks.items():
            if block_info.get("placed"):
                blocks_placed.append(block_type)
                block_details[block_type] = {
                    "position": block_info.get("position"),
                    "parameters": block_info.get("parameters")
                }
        
        return {
            "project_id": metadata.get("project_id"),
            "name": metadata.get("name"),
            "created": metadata.get("created"),
            "last_modified": metadata.get("last_modified"),
            "description": metadata.get("description"),
            "blocks_placed": blocks_placed,
            "block_details": block_details,
            "ui_state": config.get("ui_state", {}),
            "test_run_count": len(project_data.get("results", {}).get("test_runs", []))
        }
    
    def _format_test_run_data(self, test_run_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format test run data for Noira's consumption"""
        # Extract key information
        formatted = {
            "test_run_id": test_run_data.get("test_run_id"),
            "project_id": test_run_data.get("project_id"),
            "timestamp": test_run_data.get("timestamp"),
            "block_type": test_run_data.get("block_type"),
            "asset": test_run_data.get("asset"),
            "parameter": test_run_data.get("perturbation"),
            "range_tested": test_run_data.get("range_tested", []),
            "parameters": test_run_data.get("parameters", {}),
            "results_summary": {
                "data_points": len(test_run_data.get("results", [])),
                "baseline_volatility_daily": test_run_data.get("baseline_portfolio_volatility_daily"),
                "baseline_volatility_annualized": test_run_data.get("baseline_portfolio_volatility_annualized")
            }
        }
        
        # Add analytics if present
        if "analytics" in test_run_data:
            analytics = test_run_data["analytics"]
            formatted["analytics_summary"] = {
                "mode": analytics.get("mode"),
                "sensitivity_metrics": analytics.get("sensitivity_metrics", {}),
                "performance_metrics": analytics.get("performance_metrics", {})
            }
            
            # Add quantum metrics if it's a quantum test
            if test_run_data["block_type"] == "quantum" and "quantum_metrics" in analytics:
                formatted["quantum_metrics"] = analytics["quantum_metrics"]
        
        # Add detailed results if needed (first few points as sample)
        if test_run_data.get("results"):
            formatted["sample_results"] = test_run_data["results"][:3]  # First 3 data points
        
        return formatted