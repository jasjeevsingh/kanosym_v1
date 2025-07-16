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
import numpy as np

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
            
            elif tool_name == "update_block_position":
                return self._handle_update_block_position(arguments)
            
            elif tool_name == "update_block_parameters":
                return self._handle_update_block_parameters(arguments)
            
            elif tool_name == "add_block":
                return self._handle_add_block(arguments)
            
            elif tool_name == "remove_block":
                return self._handle_remove_block(arguments)
            
            elif tool_name == "create_project":
                return self._handle_create_project(arguments)
            
            elif tool_name == "delete_test_run":
                return self._handle_delete_test_run(arguments)
            
            elif tool_name == "delete_project":
                return self._handle_delete_project(arguments)
            
            elif tool_name == "fetch_asset_volatility":
                return self._handle_fetch_asset_volatility(arguments)
            
            elif tool_name == "estimate_correlation_matrix":
                return self._handle_estimate_correlation_matrix(arguments)
            
            elif tool_name == "run_sensitivity_test":
                return self._handle_run_sensitivity_test(arguments)
            
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
        """Handle search_test_runs tool call - now with flexible filtering"""
        # Default to 'recent' if no date_filter specified
        date_filter = arguments.get("date_filter", "recent")
        limit = arguments.get("limit", 10)
        
        # Get all test runs
        all_test_runs = self.file_manager.list_test_runs()
        
        # Sort by timestamp for 'recent' mode
        if date_filter == "recent" or not any([
            arguments.get("project_filter"),
            arguments.get("asset_filter"),
            arguments.get("block_type_filter"),
            arguments.get("test_run_id_prefix")
        ]):
            # Sort by timestamp descending for recent results
            all_test_runs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        
        # Apply date filtering if not 'recent'
        if date_filter != "recent":
            filtered_runs = self._filter_test_runs_by_date(all_test_runs, date_filter, arguments)
        else:
            filtered_runs = all_test_runs
        
        # Apply additional filters
        if arguments.get("project_filter"):
            project_filter = arguments["project_filter"]
            
            # First try to find project by name to get its ID
            project_id_to_match = None
            projects = self.file_manager.list_projects()
            for project in projects:
                if project_filter.lower() == project["name"].lower():
                    project_id_to_match = project["project_id"]
                    break
            
            # If exact match not found, try partial match
            if not project_id_to_match:
                for project in projects:
                    if project_filter.lower() in project["name"].lower():
                        project_id_to_match = project["project_id"]
                        break
            
            # Filter by project_id if found, otherwise filter by the original string
            if project_id_to_match:
                filtered_runs = [tr for tr in filtered_runs if tr.get("project_id") == project_id_to_match]
            else:
                # Fallback: check if filter string is in project_id (in case user provided the ID directly)
                filtered_runs = [tr for tr in filtered_runs if project_filter.lower() in tr.get("project_id", "").lower()]
        
        if arguments.get("asset_filter"):
            asset_filter = arguments["asset_filter"].upper()
            filtered_runs = [tr for tr in filtered_runs if tr.get("parameters", {}).get("asset") == asset_filter]
        
        if arguments.get("block_type_filter"):
            filtered_runs = [tr for tr in filtered_runs if tr.get("block_type") == arguments["block_type_filter"]]
        
        if arguments.get("test_run_id_prefix"):
            prefix = arguments["test_run_id_prefix"]
            filtered_runs = [tr for tr in filtered_runs if tr.get("test_run_id", "").startswith(prefix)]
        
        # Build summary of applied filters
        filters_applied = []
        if date_filter != "recent":
            filters_applied.append(f"date={date_filter}")
        if arguments.get("project_filter"):
            filters_applied.append(f"project='{arguments['project_filter']}'")
        if arguments.get("asset_filter"):
            filters_applied.append(f"asset={arguments['asset_filter']}")
        if arguments.get("block_type_filter"):
            filters_applied.append(f"block_type={arguments['block_type_filter']}")
        if arguments.get("test_run_id_prefix"):
            filters_applied.append(f"id_prefix='{arguments['test_run_id_prefix']}'")
        
        # Limit results
        total_matches = len(filtered_runs)
        filtered_runs = filtered_runs[:limit]
        
        # Load full data for each test run
        results = []
        for tr in filtered_runs:
            full_data = self.file_manager.load_test_run(tr["test_run_id"])
            if full_data:
                results.append(self._format_test_run_data(full_data))
        
        # Create descriptive summary
        if filters_applied:
            summary = f"Found {len(results)} test runs (of {total_matches} total) matching: {', '.join(filters_applied)}"
        else:
            summary = f"Found {len(results)} most recent test runs (of {total_matches} total)"
        
        return {
            "success": True,
            "data": results,
            "summary": summary,
            "total_matches": total_matches,
            "filters_applied": filters_applied
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
        if date_filter == "recent":
            # Return all test runs sorted by timestamp
            return sorted(test_runs, key=lambda x: x.get("timestamp", ""), reverse=True)
        
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
    
    def _handle_update_block_position(self, arguments: dict) -> dict:
        """Handle update_block_position tool call"""
        project_name = arguments.get("project_name")
        block_type = arguments.get("block_type")
        new_position = arguments.get("new_position")
        
        if not all([project_name, block_type, new_position]):
            return {"success": False, "error": "project_name, block_type, and new_position are required"}
        
        # Load the project
        project_config = self.file_manager.load_project(project_name)
        if not project_config:
            return {"success": False, "error": f"Project '{project_name}' not found"}
        
        # Check if block exists and is placed
        blocks = project_config.get("configuration", {}).get("blocks", {})
        if block_type not in blocks:
            return {"success": False, "error": f"Block type '{block_type}' not found in project"}
        
        if not blocks[block_type].get("placed"):
            return {"success": False, "error": f"Block '{block_type}' is not placed on canvas"}
        
        # Update position
        blocks[block_type]["position"] = new_position
        
        # Save the project
        if self.file_manager.save_project(project_name, project_config):
            logger.info(f"✅ Modified project '{project_name}': Moved {block_type} block to ({new_position['x']}, {new_position['y']})")
            return {
                "success": True,
                "data": {"block_type": block_type, "new_position": new_position},
                "summary": f"Moved {block_type} block to position ({new_position['x']}, {new_position['y']})"
            }
        else:
            return {"success": False, "error": "Failed to save project"}
    
    def _handle_update_block_parameters(self, arguments: dict) -> dict:
        """Handle update_block_parameters tool call - performs partial parameter updates"""
        project_name = arguments.get("project_name")
        block_type = arguments.get("block_type")
        parameters = arguments.get("parameters")
        
        if not all([project_name, block_type, parameters]):
            return {"success": False, "error": "project_name, block_type, and parameters are required"}
        
        # Validate parameters if portfolio is being updated
        if "portfolio" in parameters:
            portfolio = parameters["portfolio"]
            if "weights" in portfolio:
                weights = portfolio["weights"]
                if not isinstance(weights, list) or not all(isinstance(w, (int, float)) for w in weights):
                    return {"success": False, "error": "Weights must be a list of numbers"}
                total_weight = sum(weights)
                if abs(total_weight - 1.0) > 0.01:
                    return {"success": False, "error": f"Weights must sum to 1.0 (current sum: {total_weight:.3f})"}
            
            if "volatility" in portfolio:
                volatility = portfolio["volatility"]
                if not isinstance(volatility, list) or not all(isinstance(v, (int, float)) and v > 0 for v in volatility):
                    return {"success": False, "error": "Volatility must be a list of positive numbers"}
            
            if "correlation_matrix" in portfolio:
                corr_matrix = portfolio["correlation_matrix"]
                if not isinstance(corr_matrix, list) or not all(isinstance(row, list) for row in corr_matrix):
                    return {"success": False, "error": "Correlation matrix must be a 2D list"}
                # Check if square matrix
                n = len(corr_matrix)
                if not all(len(row) == n for row in corr_matrix):
                    return {"success": False, "error": "Correlation matrix must be square"}
                
                # Check if matrix dimensions match other portfolio arrays
                if "assets" in portfolio and len(portfolio["assets"]) != n:
                    return {"success": False, "error": f"Correlation matrix size ({n}x{n}) doesn't match number of assets ({len(portfolio['assets'])})"}
                if "weights" in portfolio and len(portfolio["weights"]) != n:
                    return {"success": False, "error": f"Correlation matrix size ({n}x{n}) doesn't match number of weights ({len(portfolio['weights'])})"}
                if "volatility" in portfolio and len(portfolio["volatility"]) != n:
                    return {"success": False, "error": f"Correlation matrix size ({n}x{n}) doesn't match number of volatilities ({len(portfolio['volatility'])})"}
                
                # Check diagonal elements are 1
                for i in range(n):
                    if abs(corr_matrix[i][i] - 1.0) > 0.01:
                        return {"success": False, "error": f"Diagonal element [{i}][{i}] must be 1.0 (found {corr_matrix[i][i]})"}
                
                # Check values are in [-1, 1]
                for i in range(n):
                    for j in range(n):
                        val = corr_matrix[i][j]
                        if not isinstance(val, (int, float)):
                            return {"success": False, "error": f"Correlation matrix element [{i}][{j}] must be a number"}
                        if val < -1 or val > 1:
                            return {"success": False, "error": f"Correlation [{i}][{j}] = {val} is outside valid range [-1, 1]"}
                
                # Check symmetry
                for i in range(n):
                    for j in range(i + 1, n):
                        if abs(corr_matrix[i][j] - corr_matrix[j][i]) > 0.0001:
                            return {"success": False, "error": f"Correlation matrix must be symmetric: [{i}][{j}]={corr_matrix[i][j]} != [{j}][{i}]={corr_matrix[j][i]}"}
                
                # Check positive semi-definiteness (all eigenvalues >= 0)
                try:
                    eigenvalues = np.linalg.eigvals(corr_matrix)
                    min_eigenvalue = np.min(eigenvalues.real)
                    if min_eigenvalue < -0.01:  # Allow small numerical errors
                        return {"success": False, "error": f"Correlation matrix is not positive semi-definite (min eigenvalue: {min_eigenvalue:.4f}). This means the correlations are mathematically inconsistent."}
                except Exception as e:
                    logger.warning(f"Could not check positive semi-definiteness: {str(e)}")
        
        # Load the project
        project_config = self.file_manager.load_project(project_name)
        if not project_config:
            return {"success": False, "error": f"Project '{project_name}' not found"}
        
        # Check if block exists
        blocks = project_config.get("configuration", {}).get("blocks", {})
        if block_type not in blocks:
            return {"success": False, "error": f"Block type '{block_type}' not found in project"}
        
        # Initialize parameters if not exists
        if blocks[block_type].get("parameters") is None:
            blocks[block_type]["parameters"] = {}
        
        # Deep merge for nested structures like portfolio
        if "portfolio" in parameters and "portfolio" in blocks[block_type]["parameters"]:
            # Merge portfolio fields individually
            existing_portfolio = blocks[block_type]["parameters"]["portfolio"]
            new_portfolio = parameters["portfolio"]
            for key, value in new_portfolio.items():
                existing_portfolio[key] = value
        else:
            # Update other parameters
            blocks[block_type]["parameters"].update(parameters)
        
        # Update last modified
        project_config["metadata"]["last_modified"] = datetime.now().isoformat()
        
        # Save the project
        if self.file_manager.save_project(project_name, project_config):
            logger.info(f"✅ Modified project '{project_name}': Updated {block_type} block parameters")
            return {
                "success": True,
                "data": {"block_type": block_type, "parameters": parameters},
                "summary": f"Updated {block_type} block parameters"
            }
        else:
            return {"success": False, "error": "Failed to save project"}
    
    def _handle_add_block(self, arguments: dict) -> dict:
        """Handle add_block tool call"""
        project_name = arguments.get("project_name")
        block_type = arguments.get("block_type")
        position = arguments.get("position")
        parameters = arguments.get("parameters", {})
        
        if not all([project_name, block_type, position]):
            return {"success": False, "error": "project_name, block_type, and position are required"}
        
        # Validate that parameters include portfolio with correlation matrix
        if not parameters:
            return {"success": False, "error": "Parameters must be provided with portfolio configuration"}
        
        if "portfolio" not in parameters:
            return {"success": False, "error": "Portfolio configuration is required in parameters"}
        
        portfolio = parameters["portfolio"]
        
        # Validate required portfolio fields
        required_fields = ["assets", "weights", "volatility", "correlation_matrix"]
        missing_fields = [field for field in required_fields if field not in portfolio]
        if missing_fields:
            return {"success": False, "error": f"Portfolio is missing required fields: {', '.join(missing_fields)}"}
        
        # Validate assets
        assets = portfolio["assets"]
        if not isinstance(assets, list) or len(assets) == 0:
            return {"success": False, "error": "Assets must be a non-empty list"}
        
        n_assets = len(assets)
        
        # Validate weights
        weights = portfolio["weights"]
        if not isinstance(weights, list) or len(weights) != n_assets:
            return {"success": False, "error": f"Weights must be a list of {n_assets} numbers (one for each asset)"}
        
        if not all(isinstance(w, (int, float)) for w in weights):
            return {"success": False, "error": "All weights must be numbers"}
        
        # Check for negative weights
        for i, w in enumerate(weights):
            if w < 0:
                return {"success": False, "error": f"Weight for asset {assets[i]} must be non-negative (got {w})"}
        
        total_weight = sum(weights)
        if abs(total_weight - 1.0) > 0.01:
            return {"success": False, "error": f"Weights must sum to 1.0 (current sum: {total_weight:.3f})"}
        
        # Validate volatility
        volatility = portfolio["volatility"]
        if not isinstance(volatility, list) or len(volatility) != n_assets:
            return {"success": False, "error": f"Volatility must be a list of {n_assets} positive numbers"}
        
        if not all(isinstance(v, (int, float)) and v > 0 for v in volatility):
            return {"success": False, "error": "All volatilities must be positive numbers"}
        
        # Validate correlation matrix
        corr_matrix = portfolio["correlation_matrix"]
        if not isinstance(corr_matrix, list) or len(corr_matrix) != n_assets:
            return {"success": False, "error": f"Correlation matrix must be a {n_assets}x{n_assets} matrix"}
        
        for i, row in enumerate(corr_matrix):
            if not isinstance(row, list) or len(row) != n_assets:
                return {"success": False, "error": f"Correlation matrix row {i} must have {n_assets} elements"}
            
            for j, val in enumerate(row):
                if not isinstance(val, (int, float)):
                    return {"success": False, "error": f"Correlation matrix element [{i}][{j}] must be a number"}
                
                # Check diagonal elements
                if i == j and abs(val - 1.0) > 0.01:
                    return {"success": False, "error": f"Diagonal element [{i}][{i}] must be 1.0 (found {val})"}
                
                # Check range
                if val < -1 or val > 1:
                    return {"success": False, "error": f"Correlation [{i}][{j}] = {val} is outside valid range [-1, 1]"}
        
        # Check symmetry
        for i in range(n_assets):
            for j in range(i + 1, n_assets):
                if abs(corr_matrix[i][j] - corr_matrix[j][i]) > 0.0001:
                    return {"success": False, "error": f"Correlation matrix must be symmetric: [{i}][{j}]={corr_matrix[i][j]} != [{j}][{i}]={corr_matrix[j][i]}"}
        
        # Check positive semi-definiteness
        try:
            eigenvalues = np.linalg.eigvals(corr_matrix)
            min_eigenvalue = np.min(eigenvalues.real)
            if min_eigenvalue < -0.01:  # Allow small numerical errors
                return {"success": False, "error": f"Correlation matrix is not positive semi-definite (min eigenvalue: {min_eigenvalue:.4f})"}
        except Exception as e:
            logger.warning(f"Could not check positive semi-definiteness: {str(e)}")
        
        # Validate other required parameters based on block type
        if "param" not in parameters:
            return {"success": False, "error": "Parameter 'param' is required to specify which parameter to perturb"}
        
        if "range" not in parameters:
            return {"success": False, "error": "Parameter 'range' is required to specify perturbation range [min, max]"}
        
        if "steps" not in parameters:
            return {"success": False, "error": "Parameter 'steps' is required to specify number of perturbation steps"}
        
        # If perturbing a specific asset's parameter, validate asset is specified
        if parameters["param"] in ["volatility", "weight"] and "asset" not in parameters:
            return {"success": False, "error": f"Parameter 'asset' is required when perturbing {parameters['param']}"}
        
        # Validate test range values
        param_type = parameters["param"]
        test_range = parameters["range"]
        if param_type == "weight":
            if test_range[0] < 0 or test_range[1] > 1:
                return {"success": False, "error": f"Weight test range must be between 0 and 1. Got [{test_range[0]:.3f}, {test_range[1]:.3f}]"}
        elif param_type == "volatility":
            if test_range[0] <= 0 or test_range[1] <= 0:
                return {"success": False, "error": f"Volatility test range must contain only positive values. Got [{test_range[0]:.3f}, {test_range[1]:.3f}]"}
        elif param_type == "correlation":
            if test_range[0] < -1 or test_range[1] > 1:
                return {"success": False, "error": f"Correlation test range must be between -1 and 1. Got [{test_range[0]:.3f}, {test_range[1]:.3f}]"}
        
        # Load the project
        project_config = self.file_manager.load_project(project_name)
        if not project_config:
            return {"success": False, "error": f"Project '{project_name}' not found"}
        
        # Check if block already exists and is placed
        blocks = project_config.get("configuration", {}).get("blocks", {})
        if block_type in blocks and blocks[block_type].get("placed"):
            return {"success": False, "error": f"Block '{block_type}' is already placed on canvas"}
        
        # Add or update block
        if block_type not in blocks:
            blocks[block_type] = {}
        
        blocks[block_type]["placed"] = True
        blocks[block_type]["position"] = position
        blocks[block_type]["parameters"] = parameters
        
        # Update UI state
        ui_state = project_config.get("configuration", {}).get("ui_state", {})
        ui_state["current_block_mode"] = block_type
        ui_state["block_move_count"] = ui_state.get("block_move_count", 0) + 1
        
        # Update last modified
        project_config["metadata"]["last_modified"] = datetime.now().isoformat()
        
        # Save the project
        if self.file_manager.save_project(project_name, project_config):
            logger.info(f"✅ Modified project '{project_name}': Added {block_type} block at ({position['x']}, {position['y']})")
            return {
                "success": True,
                "data": {"block_type": block_type, "position": position},
                "summary": f"Added {block_type} block at position ({position['x']}, {position['y']})"
            }
        else:
            return {"success": False, "error": "Failed to save project"}
    
    def _handle_remove_block(self, arguments: dict) -> dict:
        """Handle remove_block tool call"""
        project_name = arguments.get("project_name")
        block_type = arguments.get("block_type")
        
        if not all([project_name, block_type]):
            return {"success": False, "error": "project_name and block_type are required"}
        
        # Load the project
        project_config = self.file_manager.load_project(project_name)
        if not project_config:
            return {"success": False, "error": f"Project '{project_name}' not found"}
        
        # Check if block exists
        blocks = project_config.get("configuration", {}).get("blocks", {})
        if block_type not in blocks:
            return {"success": False, "error": f"Block type '{block_type}' not found in project"}
        
        # Mark block as not placed
        blocks[block_type]["placed"] = False
        blocks[block_type]["position"] = None
        
        # Update last modified
        project_config["metadata"]["last_modified"] = datetime.now().isoformat()
        
        # Save the project
        if self.file_manager.save_project(project_name, project_config):
            logger.info(f"✅ Modified project '{project_name}': Removed {block_type} block from canvas")
            return {
                "success": True,
                "data": {"block_type": block_type},
                "summary": f"Removed {block_type} block from canvas"
            }
        else:
            return {"success": False, "error": "Failed to save project"}
    
    def _handle_create_project(self, arguments: dict) -> dict:
        """Handle create_project tool call"""
        project_name = arguments.get("project_name")
        description = arguments.get("description", "")
        
        if not project_name:
            return {"success": False, "error": "project_name is required"}
        
        # Check if project already exists
        existing_projects = self.file_manager.list_projects()
        if any(p["name"].lower() == project_name.lower() for p in existing_projects):
            return {"success": False, "error": f"Project '{project_name}' already exists"}
        
        # Create new project
        project_id = f"proj-{int(datetime.now().timestamp())}"
        project_config = self.file_manager.create_project(project_name, project_id)
        
        if project_config:
            # Add description if provided
            if description:
                project_config["metadata"]["description"] = description
                self.file_manager.save_project(project_name, project_config)
            
            logger.info(f"✅ Created new project '{project_name}' (ID: {project_id})")
            return {
                "success": True,
                "data": {
                    "project_id": project_id,
                    "name": project_name,
                    "description": description
                },
                "summary": f"Created new project '{project_name}' (ID: {project_id})"
            }
        else:
            return {"success": False, "error": "Failed to create project"}
    
    def _handle_delete_test_run(self, arguments: dict) -> dict:
        """Handle delete_test_run tool call"""
        test_run_id = arguments.get("test_run_id")
        confirm = arguments.get("confirm", False)
        
        if not test_run_id:
            return {"success": False, "error": "test_run_id is required"}
        
        if not confirm:
            return {"success": False, "error": "Please set confirm=true to delete the test run"}
        
        # Load test run to get project info
        test_run = self.file_manager.load_test_run(test_run_id)
        if not test_run:
            return {"success": False, "error": f"Test run '{test_run_id}' not found"}
        
        project_id = test_run.get("project_id")
        
        # Delete the test run file
        test_run_path = self.file_manager.test_runs_dir / f"{test_run_id}.json"
        try:
            test_run_path.unlink()
            logger.info(f"Deleted test run file: {test_run_id}")
            
            # Update project to remove test run reference
            projects = self.file_manager.list_projects()
            for project in projects:
                if project["project_id"] == project_id:
                    project_config = self.file_manager.load_project(project["name"])
                    if project_config:
                        test_runs = project_config.get("results", {}).get("test_runs", [])
                        if test_run_id in test_runs:
                            test_runs.remove(test_run_id)
                            self.file_manager.save_project(project["name"], project_config)
                    break
            
            logger.warning(f"⚠️ Deleted test run {test_run_id} from project {project_id}")
            return {
                "success": True,
                "data": {"test_run_id": test_run_id},
                "summary": f"Deleted test run {test_run_id}"
            }
        except Exception as e:
            return {"success": False, "error": f"Failed to delete test run: {str(e)}"}
    
    def _handle_delete_project(self, arguments: dict) -> dict:
        """Handle delete_project tool call"""
        project_name = arguments.get("project_name")
        confirm = arguments.get("confirm", False)
        
        return self.delete_project(project_name, confirm)
    
    def delete_project(self, project_name: str, confirm: bool = False) -> Dict[str, Any]:
        """Delete a project and all its associated data."""
        if not confirm:
            return {"success": False, "error": "Please set confirm=true to delete the project"}
        
        # Check if project exists
        project_config = self.file_manager.load_project(project_name)
        if not project_config:
            return {"success": False, "error": f"Project '{project_name}' not found"}
        
        # Delete associated test runs
        test_runs = project_config.get("results", {}).get("test_runs", [])
        for test_run_id in test_runs:
            test_run_path = self.file_manager.test_runs_dir / f"{test_run_id}.json"
            if test_run_path.exists():
                test_run_path.unlink()
                logger.info(f"Deleted test run: {test_run_id}")
        
        # Delete project file
        project_path = self.file_manager.projects_dir / project_name / f"{project_name}.ksm"
        project_dir = self.file_manager.projects_dir / project_name
        
        try:
            if project_path.exists():
                project_path.unlink()
            if project_dir.exists():
                project_dir.rmdir()
            
            logger.warning(f"⚠️ Deleted project '{project_name}' and {len(test_runs)} test runs")
            return {
                "success": True,
                "data": {"project_name": project_name, "test_runs_deleted": len(test_runs)},
                "summary": f"Deleted project '{project_name}' and {len(test_runs)} test runs"
            }
        except Exception as e:
            return {"success": False, "error": f"Failed to delete project: {str(e)}"}
    
    def _handle_fetch_asset_volatility(self, arguments: dict) -> dict:
        """Handle fetch_asset_volatility tool call"""
        symbols = arguments.get("symbols", [])
        start_date = arguments.get("start_date")
        end_date = arguments.get("end_date")
        window = arguments.get("window", 60)
        frequency = arguments.get("frequency", "1d")
        
        return self.fetch_asset_volatility(symbols, start_date, end_date, window, frequency)
    
    def fetch_asset_volatility(self, symbols: List[str], start_date: str = None, end_date: str = None, 
                               window: int = 60, frequency: str = "1d") -> Dict[str, Any]:
        """Fetch historical volatility for assets using the existing API endpoint."""
        try:
            # Use existing API endpoint
            import requests
            response = requests.post(
                "http://localhost:5001/api/fetch_volatility",
                json={
                    "symbols": symbols,
                    "start": start_date,
                    "end": end_date,
                    "window": window,
                    "frequency": frequency
                }
            )
            
            data = response.json()
            if data.get("success") and data.get("volatility"):
                volatilities = data["volatility"]
                summary_parts = []
                for symbol, vol in volatilities.items():
                    if isinstance(vol, (int, float)):
                        summary_parts.append(f"{symbol}: {vol:.4f}")
                    else:
                        summary_parts.append(f"{symbol}: {vol}")
                
                return {
                    "success": True,
                    "data": volatilities,
                    "summary": "Volatility - " + ", ".join(summary_parts)
                }
            else:
                return {"success": False, "error": data.get("error", "Failed to fetch volatility")}
        
        except Exception as e:
            return {"success": False, "error": f"Failed to fetch volatility: {str(e)}"}
    
    def _handle_estimate_correlation_matrix(self, arguments: dict) -> dict:
        """Handle estimate_correlation_matrix tool call"""
        symbols = arguments.get("symbols", [])
        start_date = arguments.get("start_date")
        end_date = arguments.get("end_date")
        frequency = arguments.get("frequency", "1d")
        
        return self.estimate_correlation_matrix(symbols, start_date, end_date, frequency)
    
    def estimate_correlation_matrix(self, symbols: List[str], start_date: str = None, 
                                   end_date: str = None, frequency: str = "1d") -> Dict[str, Any]:
        """Estimate correlation matrix for assets using the existing API endpoint."""
        try:
            # Use existing API endpoint
            import requests
            response = requests.post(
                "http://localhost:5001/api/fetch_correlation_matrix",
                json={
                    "symbols": symbols,
                    "start": start_date,
                    "end": end_date,
                    "frequency": frequency
                }
            )
            
            data = response.json()
            if data.get("success") and data.get("correlation_matrix"):
                matrix = data["correlation_matrix"]
                # Format as readable table
                summary_lines = ["Correlation Matrix:"]
                header = "     " + "  ".join(f"{s:>6}" for s in symbols)
                summary_lines.append(header)
                
                for i, row in enumerate(matrix):
                    row_str = f"{symbols[i]:>4} " + "  ".join(f"{val:>6.3f}" for val in row)
                    summary_lines.append(row_str)
                
                return {
                    "success": True,
                    "data": {"matrix": matrix, "symbols": symbols},
                    "summary": "\n".join(summary_lines)
                }
            else:
                return {"success": False, "error": data.get("error", "Failed to fetch correlation matrix")}
        
        except Exception as e:
            return {"success": False, "error": f"Failed to estimate correlation matrix: {str(e)}"}
    
    def _handle_run_sensitivity_test(self, arguments: dict) -> dict:
        """Handle run_sensitivity_test tool call"""
        project_name = arguments.get("project_name")
        block_type = arguments.get("block_type")
        use_noise_model = arguments.get("use_noise_model", False)
        noise_model_type = arguments.get("noise_model_type", "fast")
        
        return self.run_sensitivity_test(project_name, block_type, use_noise_model, noise_model_type)
    
    def run_sensitivity_test(self, project_name: str, block_type: str, 
                           use_noise_model: bool = False, noise_model_type: str = "fast") -> Dict[str, Any]:
        """Run a sensitivity test for a specific block"""
        try:
            # Load project to get block parameters
            project_config = self.file_manager.load_project(project_name)
            if not project_config:
                return {"success": False, "error": f"Project '{project_name}' not found"}
            
            # Check if block exists
            blocks = project_config.get("configuration", {}).get("blocks", {})
            if block_type not in blocks or not blocks[block_type].get("placed"):
                return {"success": False, "error": f"{block_type.capitalize()} block not found in project"}
            
            # Get block parameters
            params = blocks[block_type].get("parameters", {})
            if not params:
                return {"success": False, "error": f"{block_type.capitalize()} block has no parameters configured"}
            
            # Prepare API request
            api_endpoint = f"http://localhost:5001/api/{block_type}_sensitivity_test"
            
            # Build request data
            request_data = {
                "portfolio": params.get("portfolio"),
                "param": params.get("param"),
                "asset": params.get("asset"),
                "range": params.get("range"),
                "steps": params.get("steps"),
                "project_id": project_config.get("metadata", {}).get("project_id")
            }
            
            # Add quantum-specific parameters
            if block_type == "quantum":
                request_data["use_noise_model"] = use_noise_model
                request_data["noise_model_type"] = noise_model_type
            
            # Log the request data for debugging
            logger.info(f"Sending sensitivity test request to {api_endpoint}")
            logger.info(f"Request data: {request_data}")
            
            # Call the API
            import requests
            response = requests.post(api_endpoint, json=request_data)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    # Extract key metrics
                    analytics = result.get("analytics", {})
                    perf_metrics = analytics.get("performance_metrics", {})
                    
                    summary = f"Completed {block_type} sensitivity test for {params.get('param')} "
                    if params.get('asset'):
                        summary += f"on {params.get('asset')} "
                    summary += f"with {params.get('steps')} steps. "
                    summary += f"Execution time: {perf_metrics.get('total_execution_time', 0):.2f}s"
                    
                    return {
                        "success": True,
                        "data": {
                            "test_run_id": result.get("test_run_id"),
                            "execution_time": perf_metrics.get('total_execution_time', 0),
                            "results_count": len(result.get("results", []))
                        },
                        "summary": summary
                    }
                else:
                    error_msg = result.get("error", "Test failed")
                    logger.error(f"Sensitivity test failed for {block_type} block: {error_msg}")
                    logger.error(f"Full error response: {result}")
                    return {"success": False, "error": error_msg}
            else:
                logger.error(f"API request failed with status {response.status_code}")
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", f"API error: {response.status_code}")
                    logger.error(f"Error response: {error_data}")
                except:
                    error_msg = f"API error: {response.status_code} - {response.text}"
                    logger.error(f"Raw error response: {response.text}")
                return {"success": False, "error": error_msg}
        
        except Exception as e:
            return {"success": False, "error": f"Failed to run sensitivity test: {str(e)}"}