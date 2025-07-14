"""
api.py

Backend API entry point for KANOSYM. Exposes endpoints for portfolio input, perturbation, QAE, and results formatting.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from noira.chat_controller import chat_controller
import os
import logging
logger = logging.getLogger(__name__)
from dotenv import load_dotenv
import werkzeug.serving
from model_blocks.quantum.quantum_sensitivity import quantum_sensitivity_test
from model_blocks.classical.classical_sensitivity import classical_sensitivity_test
from model_blocks.hybrid.hybrid_sensitivity import hybrid_sensitivity_test
from file_manager import FileManager
from database import get_db_manager
import numpy as np
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize file manager and database manager
file_manager = FileManager()
db_manager = get_db_manager()

# Custom logger to filter out thinking-status polling noise
class FilteredRequestHandler(werkzeug.serving.WSGIRequestHandler):
    def log_request(self, code='-', size='-'):
        # Filter out thinking-status endpoint logs since they're just polling
        if self.path and '/thinking-status' in self.path:
            return
        super().log_request(code, size)

def validate_portfolio(portfolio):
    """
    Validate portfolio data structure and constraints.
    
    Args:
        portfolio: Portfolio configuration dictionary
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not portfolio:
        return False, "Portfolio data is required"
    
    # Check required fields
    required_fields = ['assets', 'weights', 'volatility', 'correlation_matrix']
    for field in required_fields:
        if field not in portfolio:
            return False, f"Missing required field: {field}"
    
    assets = portfolio['assets']
    weights = portfolio['weights']
    volatility = portfolio['volatility']
    correlation_matrix = portfolio['correlation_matrix']
    
    # Check asset count constraints
    if len(assets) < 1:
        return False, "Portfolio must have at least 1 asset"
    if len(assets) > 5:
        return False, "Portfolio cannot have more than 5 assets"
    
    # Check array lengths match
    if len(assets) != len(weights) or len(assets) != len(volatility):
        return False, "Number of assets, weights, and volatility values must match"
    
    # Check correlation matrix dimensions
    if len(correlation_matrix) != len(assets):
        return False, "Correlation matrix dimensions must match number of assets"
    
    for row in correlation_matrix:
        if len(row) != len(assets):
            return False, "Correlation matrix must be square"
    
    # Validate weights (should sum to 1, all positive)
    total_weight = sum(weights)
    if abs(total_weight - 1.0) > 0.01:  # Allow small floating point errors
        return False, f"Weights must sum to 1.0 (current sum: {total_weight:.3f})"
    
    for i, weight in enumerate(weights):
        if weight < 0:
            return False, f"Weight for asset {assets[i]} must be non-negative"
    
    # Validate volatility (all positive)
    for i, vol in enumerate(volatility):
        if vol <= 0:
            return False, f"Volatility for asset {assets[i]} must be positive"
    
    # Validate correlation matrix (symmetric, diagonal = 1, values in [-1, 1])
    for i in range(len(assets)):
        for j in range(len(assets)):
            if i == j:
                if abs(correlation_matrix[i][j] - 1.0) > 0.01:
                    return False, f"Correlation matrix diagonal must be 1.0 for asset {assets[i]}"
            else:
                if abs(correlation_matrix[i][j] - correlation_matrix[j][i]) > 0.01:
                    return False, f"Correlation matrix must be symmetric"
                if correlation_matrix[i][j] < -1 or correlation_matrix[i][j] > 1:
                    return False, f"Correlation values must be between -1 and 1"
    
    return True, ""

def validate_sensitivity_params(param, asset, range_vals, steps, portfolio):
    """
    Validate sensitivity analysis parameters.
    
    Args:
        param: Parameter to perturb
        asset: Asset to perturb
        range_vals: Range [min, max] for perturbation
        steps: Number of steps
        portfolio: Portfolio configuration
        
    Returns:
        tuple: (is_valid, error_message)
    """
    # Validate parameter type
    valid_params = ['volatility', 'weight', 'correlation']
    if param not in valid_params:
        return False, f"Invalid parameter: {param}. Must be one of {valid_params}"
    
    # Validate asset exists in portfolio
    if asset not in portfolio['assets']:
        return False, f"Asset '{asset}' not found in portfolio"
    
    # Validate range
    if len(range_vals) != 2:
        return False, "Range must have exactly 2 values [min, max]"
    
    min_val, max_val = range_vals
    if min_val >= max_val:
        return False, "Range min must be less than range max"
    
    # Validate parameter-specific constraints
    asset_idx = portfolio['assets'].index(asset)
    
    if param == 'weight':
        if min_val < 0 or max_val > 1:
            return False, "Weight values must be between 0 and 1"
    elif param == 'volatility':
        if min_val <= 0 or max_val <= 0:
            return False, "Volatility values must be positive"
    elif param == 'correlation':
        if min_val < -1 or max_val > 1:
            return False, "Correlation values must be between -1 and 1"
    
    # Validate steps
    if steps < 2 or steps > 20:
        return False, "Steps must be between 2 and 20"
    
    return True, ""

# Chat endpoints
@app.route('/api/chat/set-api-key', methods=['POST'])
def set_api_key():
    """Set OpenAI API key"""
    data = request.get_json()
    api_key = data.get('api_key')
    
    if not api_key:
        return jsonify({"success": False, "message": "API key is required"}), 400
    
    result = chat_controller.set_api_key(api_key)
    return jsonify(result), 200 if result['success'] else 400

@app.route('/api/chat/status', methods=['GET'])
def get_chat_status():
    """Get chat API status"""
    return jsonify(chat_controller.get_api_status())

@app.route('/api/chat/send', methods=['POST'])
def send_message():
    """Send message to chat"""
    data = request.get_json()
    message = data.get('message')
    context = data.get('context')
    
    if not message:
        return jsonify({"success": False, "message": "Message is required"}), 400
    
    result = chat_controller.send_message(message, context)
    return jsonify(result), 200 if result['success'] else 400

@app.route('/api/chat/reset', methods=['POST'])
def reset_chat():
    """Reset chat history"""
    result = chat_controller.reset_chat()
    return jsonify(result)

@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """Get chat history"""
    return jsonify(chat_controller.get_chat_history())

@app.route('/api/chat/debug', methods=['GET'])
def get_debug_info():
    """Get debug information"""
    return jsonify(chat_controller.get_debug_info())

@app.route('/api/chat/debug/toggle', methods=['POST'])
def toggle_debug_mode():
    """Toggle debug mode"""
    data = request.get_json()
    enabled = data.get('enabled', False)
    result = chat_controller.set_debug_mode(enabled)
    return jsonify(result)

@app.route('/api/chat/settings', methods=['PUT'])
def update_chat_settings():
    """Update chat settings"""
    data = request.get_json()
    result = chat_controller.update_settings(
        model=data.get('model'),
        max_tokens=data.get('max_tokens'),
        temperature=data.get('temperature')
    )
    return jsonify(result)

# Placeholder endpoints for other functionality
@app.route('/api/portfolio', methods=['POST'])
def portfolio_input():
    """Portfolio input endpoint (placeholder)"""
    return jsonify({"message": "Portfolio input endpoint - not implemented yet"})

@app.route('/api/perturb', methods=['POST'])
def perturb_parameters():
    """Parameter perturbation endpoint (placeholder)"""
    return jsonify({"message": "Perturbation endpoint - not implemented yet"})

@app.route('/api/qae', methods=['POST'])
def quantum_analysis():
    """Quantum analysis endpoint (placeholder)"""
    return jsonify({"message": "QAE endpoint - not implemented yet"})

@app.route('/api/quantum_sensitivity_test', methods=['POST'])
def quantum_sensitivity_test_api():
    data = request.get_json()
    portfolio = data.get('portfolio')
    param = data.get('param')
    asset = data.get('asset')
    range_vals = data.get('range')
    steps = data.get('steps')
    project_id = data.get('project_id')  # New: project_id for autosave
    
    # Validate portfolio
    is_valid, error_msg = validate_portfolio(portfolio)
    if not is_valid:
        return jsonify({"success": False, "error": error_msg}), 400
    
    # Validate sensitivity parameters
    is_valid, error_msg = validate_sensitivity_params(param, asset, range_vals, steps, portfolio)
    if not is_valid:
        return jsonify({"success": False, "error": error_msg}), 400
    
    try:
        result = quantum_sensitivity_test(
            portfolio=portfolio,
            param=param,
            asset=asset,
            range_vals=range_vals,
            steps=steps
        )
        
        # Auto-save test run if project_id is provided
        if project_id:
            try:
                # Create test run in database
                test_run_meta = {
                    'test_type': 'quantum',
                    'parameter_type': param,
                    'asset_name': asset,
                    'range_min': range_vals[0],
                    'range_max': range_vals[1],
                    'steps': steps,
                    'baseline_volatility_daily': result.get('baseline_portfolio_volatility_daily'),
                    'baseline_volatility_annualized': result.get('baseline_portfolio_volatility_annualized'),
                    'execution_time_seconds': result.get('analytics', {}).get('performance_metrics', {}).get('total_execution_time'),
                    'status': 'completed'
                }
                
                test_run_id = db_manager.create_test_run(project_id, test_run_meta)
                
                # Save test results
                if 'results' in result:
                    db_manager.save_test_results(test_run_id, result['results'])
                
                # Save analytics
                if 'analytics' in result:
                    db_manager.save_analytics_metrics(test_run_id, result['analytics'])
                
                result["test_run_id"] = test_run_id
                result["saved_to_database"] = True
                
            except Exception as save_error:
                logger.error(f"Failed to auto-save test run: {save_error}")
                result["save_error"] = str(save_error)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/classical_sensitivity_test', methods=['POST'])
def classical_sensitivity_test_api():
    data = request.get_json()
    portfolio = data.get('portfolio')
    param = data.get('param')
    asset = data.get('asset')
    range_vals = data.get('range')
    steps = data.get('steps')
    project_id = data.get('project_id')  # New: project_id for autosave
    
    # Validate portfolio
    is_valid, error_msg = validate_portfolio(portfolio)
    if not is_valid:
        return jsonify({"success": False, "error": error_msg}), 400
    
    # Validate sensitivity parameters
    is_valid, error_msg = validate_sensitivity_params(param, asset, range_vals, steps, portfolio)
    if not is_valid:
        return jsonify({"success": False, "error": error_msg}), 400
    
    try:
        result = classical_sensitivity_test(
            portfolio=portfolio,
            param=param,
            asset=asset,
            range_vals=range_vals,
            steps=steps
        )
        
        # Auto-save test run if project_id is provided
        if project_id:
            try:
                # Create test run in database
                test_run_meta = {
                    'test_type': 'classical',
                    'parameter_type': param,
                    'asset_name': asset,
                    'range_min': range_vals[0],
                    'range_max': range_vals[1],
                    'steps': steps,
                    'baseline_volatility_daily': result.get('baseline_portfolio_volatility_daily'),
                    'baseline_volatility_annualized': result.get('baseline_portfolio_volatility_annualized'),
                    'execution_time_seconds': result.get('analytics', {}).get('performance_metrics', {}).get('total_execution_time'),
                    'status': 'completed'
                }
                
                test_run_id = db_manager.create_test_run(project_id, test_run_meta)
                
                # Save test results
                if 'results' in result:
                    db_manager.save_test_results(test_run_id, result['results'])
                
                # Save analytics
                if 'analytics' in result:
                    db_manager.save_analytics_metrics(test_run_id, result['analytics'])
                
                result["test_run_id"] = test_run_id
                result["saved_to_database"] = True
                
            except Exception as save_error:
                logger.error(f"Failed to auto-save test run: {save_error}")
                result["save_error"] = str(save_error)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/hybrid_sensitivity_test', methods=['POST'])
def hybrid_sensitivity_test_api():
    data = request.get_json()
    portfolio = data.get('portfolio')
    param = data.get('param')
    asset = data.get('asset')
    range_vals = data.get('range')
    steps = data.get('steps')
    project_id = data.get('project_id')  # New: project_id for autosave
    
    # Validate portfolio
    is_valid, error_msg = validate_portfolio(portfolio)
    if not is_valid:
        return jsonify({"success": False, "error": error_msg}), 400
    
    # Validate sensitivity parameters
    is_valid, error_msg = validate_sensitivity_params(param, asset, range_vals, steps, portfolio)
    if not is_valid:
        return jsonify({"success": False, "error": error_msg}), 400
    
    try:
        result = hybrid_sensitivity_test(
            portfolio=portfolio,
            param=param,
            asset=asset,
            range_vals=range_vals,
            steps=steps
        )
        
        # Auto-save test run if project_id is provided
        if project_id:
            try:
                # Create test run in database
                test_run_meta = {
                    'test_type': 'hybrid',
                    'parameter_type': param,
                    'asset_name': asset,
                    'range_min': range_vals[0],
                    'range_max': range_vals[1],
                    'steps': steps,
                    'baseline_volatility_daily': result.get('baseline_portfolio_volatility_daily'),
                    'baseline_volatility_annualized': result.get('baseline_portfolio_volatility_annualized'),
                    'execution_time_seconds': result.get('analytics', {}).get('performance_metrics', {}).get('total_execution_time'),
                    'status': 'completed'
                }
                
                test_run_id = db_manager.create_test_run(project_id, test_run_meta)
                
                # Save test results
                if 'results' in result:
                    db_manager.save_test_results(test_run_id, result['results'])
                
                # Save analytics
                if 'analytics' in result:
                    db_manager.save_analytics_metrics(test_run_id, result['analytics'])
                
                result["test_run_id"] = test_run_id
                result["saved_to_database"] = True
                
            except Exception as save_error:
                logger.error(f"Failed to auto-save test run: {save_error}")
                result["save_error"] = str(save_error)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# File Manager API Endpoints

@app.route('/api/projects', methods=['GET'])
def list_projects():
    """List all available projects"""
    try:
        projects = db_manager.list_projects()
        # Convert to expected format
        formatted_projects = []
        for project in projects:
            formatted_projects.append({
                "name": project['name'],
                "project_id": str(project['id']),
                "created": project['created_at'].isoformat(),
                "last_modified": project['updated_at'].isoformat(),
                "description": project['description'] or f"Portfolio sensitivity analysis project: {project['name']}"
            })
        return jsonify({
            "success": True,
            "projects": formatted_projects,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/projects', methods=['POST'])
def create_project():
    """Create a new project"""
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    
    if not name:
        return jsonify({
            "success": False,
            "error": "Project name is required",
            "timestamp": datetime.now().isoformat()
        }), 400
    
    try:
        # Check if project already exists
        existing_project = db_manager.get_project_by_name(name)
        if existing_project:
            return jsonify({
                "success": False,
                "error": "Project with this name already exists",
                "timestamp": datetime.now().isoformat()
            }), 400
        
        project_id = db_manager.create_project(name, description)
        project = db_manager.get_project(project_id)
        
        # Create initial project state
        initial_state = {
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
        db_manager.save_project_state(project_id, initial_state)

        # Also create the project folder and .ksm file in the file system
        file_manager.create_project(name, project_id)
        
        return jsonify({
            "success": True,
            "project": {
                "id": project_id,
                "name": project['name'],
                "description": project['description'],
                "created_at": project['created_at'].isoformat(),
                "updated_at": project['updated_at'].isoformat()
            },
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/projects/<project_name>', methods=['GET'])
def get_project(project_name):
    """Get a specific project"""
    try:
        project_config = file_manager.load_project(project_name)
        if project_config:
            return jsonify({
                "success": True,
                "project": project_config,
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": "Project not found",
                "timestamp": datetime.now().isoformat()
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/projects/<project_name>', methods=['PUT'])
def update_project(project_name):
    """Update a project"""
    data = request.get_json()
    project_config = data.get('project')
    
    if not project_config:
        return jsonify({
            "success": False,
            "error": "Project configuration is required",
            "timestamp": datetime.now().isoformat()
        }), 400
    
    try:
        success = file_manager.save_project(project_name, project_config)
        if success:
            return jsonify({
                "success": True,
                "message": "Project updated successfully",
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to update project",
                "timestamp": datetime.now().isoformat()
            }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/projects/<project_name>/rename', methods=['PUT'])
def rename_project(project_name):
    data = request.get_json()
    new_name = data.get('new_name')
    if not new_name:
        return jsonify({"success": False, "error": "New project name is required"}), 400
    success = file_manager.rename_project(project_name, new_name)
    if success:
        return jsonify({"success": True}), 200
    else:
        return jsonify({"success": False, "error": "Failed to rename project"}), 500

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Delete a project from the database and all related data, and remove its files from disk"""
    try:
        # Fetch project by ID to get the name
        project = db_manager.get_project(project_id)
        if not project:
            return jsonify({
                "success": False,
                "error": "Project not found",
                "timestamp": datetime.now().isoformat()
            }), 404
        project_name = project['name']
        # Delete from database
        success = db_manager.delete_project(project_id)
        if success:
            # Also delete from file system
            file_manager.delete_project(project_name)
            return jsonify({
                "success": True,
                "message": "Project deleted successfully",
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": "Project not found in database",
                "timestamp": datetime.now().isoformat()
            }), 404
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/projects/<project_id>/state', methods=['GET'])
def get_project_state(project_id):
    """Get complete project state including all test runs"""
    try:
        # Get project state from database
        project_state = db_manager.get_project_state(project_id)
        if project_state:
            return jsonify({
                "success": True,
                "project_state": project_state['state_data'],
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": "Project not found",
                "timestamp": datetime.now().isoformat()
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/projects/<project_id>/state', methods=['PUT'])
def save_project_state(project_id):
    """Save complete project state"""
    data = request.get_json()
    project_state = data.get('project_state')
    
    if not project_state:
        return jsonify({
            "success": False,
            "error": "Project state is required",
            "timestamp": datetime.now().isoformat()
        }), 400
    
    try:
        state_id = db_manager.save_project_state(project_id, project_state)
        if state_id:
            return jsonify({
                "success": True,
                "message": "Project state saved successfully",
                "state_id": state_id,
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to save project state",
                "timestamp": datetime.now().isoformat()
            }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/test-runs', methods=['GET'])
def list_test_runs():
    """List all test runs, optionally filtered by project"""
    project_id = request.args.get('project_id')
    
    try:
        test_runs = db_manager.list_test_runs(project_id)
        # Convert to expected format
        formatted_test_runs = []
        for test_run in test_runs:
            formatted_test_runs.append({
                "id": str(test_run['id']),
                "project_id": str(test_run['project_id']),
                "test_type": test_run['test_type'],
                "parameter_type": test_run['parameter_type'],
                "asset_name": test_run['asset_name'],
                "created_at": test_run['created_at'].isoformat(),
                "status": test_run['status']
            })
        return jsonify({
            "success": True,
            "test_runs": formatted_test_runs,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/test-runs/<test_run_id>', methods=['GET'])
def get_test_run(test_run_id):
    """Get a specific test run"""
    try:
        test_run_data = db_manager.get_test_run(test_run_id)
        if test_run_data:
            # Convert to expected format
            formatted_test_run = {
                "perturbation": test_run_data['parameter_type'],
                "asset": test_run_data['asset_name'],
                "range_tested": [float(test_run_data['range_min']), float(test_run_data['range_max'])],
                "baseline_portfolio_volatility_daily": float(test_run_data['baseline_volatility_daily']) if test_run_data['baseline_volatility_daily'] else None,
                "baseline_portfolio_volatility_annualized": float(test_run_data['baseline_volatility_annualized']) if test_run_data['baseline_volatility_annualized'] else None,
                "results": test_run_data['results'],
                "analytics": test_run_data['analytics'],
                "processing_mode": test_run_data['test_type'],
                "description": f"{test_run_data['test_type'].title()} sensitivity analysis for {test_run_data['asset_name']}"
            }
            return jsonify({
                "success": True,
                "test_run": formatted_test_run,
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": "Test run not found",
                "timestamp": datetime.now().isoformat()
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/test-runs', methods=['POST'])
def create_test_run():
    """Create a new test run"""
    data = request.get_json()
    project_id = data.get('project_id')
    test_run_data = data.get('test_run_data')
    
    if not project_id or not test_run_data:
        return jsonify({
            "success": False,
            "error": "Project ID and test run data are required",
            "timestamp": datetime.now().isoformat()
        }), 400
    
    try:
        test_run_id = file_manager.save_test_run(project_id, test_run_data)
        return jsonify({
            "success": True,
            "test_run_id": test_run_id,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/test-runs/<test_run_id>', methods=['DELETE'])
def delete_test_run(test_run_id):
    """Delete a test run"""
    try:
        success = db_manager.delete_test_run(test_run_id)
        if success:
            return jsonify({
                "success": True,
                "message": "Test run deleted successfully",
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": "Test run not found",
                "timestamp": datetime.now().isoformat()
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/projects/<project_name>/autosave', methods=['POST'])
def autosave_project(project_name):
    """Auto-save project state"""
    data = request.get_json()
    project_state = data.get('project_state')
    
    if not project_state:
        return jsonify({
            "success": False,
            "error": "Project state is required",
            "timestamp": datetime.now().isoformat()
        }), 400
    
    try:
        success = file_manager.save_project(project_name, project_state)
        if success:
            return jsonify({
                "success": True,
                "message": "Project auto-saved successfully",
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "error": "Failed to auto-save project",
                "timestamp": datetime.now().isoformat()
            }), 500
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/projects/<project_name>/files', methods=['POST'])
def upload_project_file(project_name):
    project_folder = file_manager.projects_dir / project_name
    if not project_folder.exists() or not project_folder.is_dir():
        return jsonify({"success": False, "error": "Project not found"}), 404
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "No file part in request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No selected file"}), 400
    # Optionally, add file type/size checks here
    save_path = project_folder / file.filename
    try:
        file.save(str(save_path))
        return jsonify({"success": True, "filename": file.filename}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/projects/<project_name>/files', methods=['GET'])
def list_project_files(project_name):
    project_folder = file_manager.projects_dir / project_name
    if not project_folder.exists() or not project_folder.is_dir():
        return jsonify({"success": False, "error": "Project not found"}), 404
    def list_files(folder):
        entries = []
        for entry in os.scandir(folder):
            if entry.is_file():
                entries.append({"name": entry.name, "type": "file"})
            elif entry.is_dir():
                # Only recurse one level for now
                entries.append({"name": entry.name, "type": "folder", "children": []})
        return entries
    tree = {
        "name": project_name,
        "type": "folder",
        "children": list_files(project_folder)
    }
    return jsonify(tree)

@app.route('/api/projects/<project_name>/files', methods=['DELETE'])
def delete_project_file(project_name):
    data = request.get_json()
    rel_path = data.get('file')
    if not rel_path:
        return jsonify({"success": False, "error": "No file specified"}), 400
    project_folder = file_manager.projects_dir / project_name
    file_path = project_folder / rel_path
    try:
        if file_path.exists() and file_path.is_file():
            file_path.unlink()
            return jsonify({"success": True}), 200
        else:
            return jsonify({"success": False, "error": "File not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

class NoPollingRequestFilter(logging.Filter):
    """Filter out frequent polling requests from Flask logs"""
    
    def filter(self, record):
        # Filter out GET requests to polling endpoints
        if hasattr(record, 'getMessage'):
            message = record.getMessage()
            if ('GET /api/chat/display-updates' in message or 
                'GET /api/chat/thinking-status' in message):
                return False
        return True

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
