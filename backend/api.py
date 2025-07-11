"""
api.py

Backend API entry point for KANOSYM. Exposes endpoints for portfolio input, perturbation, QAE, and results formatting.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from noira.chat_controller import chat_controller
import os
import logging
from dotenv import load_dotenv
import werkzeug.serving
from model_blocks.quantum.quantum_sensitivity import quantum_sensitivity_test
from model_blocks.classical.classical_sensitivity import classical_sensitivity_test
from model_blocks.hybrid.hybrid_sensitivity import hybrid_sensitivity_test
from file_manager import FileManager
import numpy as np
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize file manager
file_manager = FileManager()

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
                test_run_data = {
                    "block_type": "quantum",
                    "parameters": {
                        "portfolio": portfolio,
                        "param": param,
                        "asset": asset,
                        "range": range_vals,
                        "steps": steps
                    },
                    "results": result,
                    "analytics": {
                        "mode": "quantum",
                        "performance_metrics": {
                            "total_execution_time": result.get("execution_time", 0),
                            "throughput": result.get("throughput", 0),
                            "steps_processed": steps,
                            "memory_usage_mb": result.get("memory_usage", 0),
                            "cpu_usage_percent": result.get("cpu_usage", 0)
                        },
                        "statistical_metrics": {
                            "confidence_interval_95": result.get("confidence_interval", [0, 0]),
                            "coefficient_of_variation": result.get("coefficient_of_variation", 0),
                            "skewness": result.get("skewness", 0),
                            "kurtosis": result.get("kurtosis", 0),
                            "standard_error": result.get("standard_error", 0),
                            "statistical_significance": result.get("statistical_significance", 0)
                        },
                        "quantum_metrics": {
                            "qubits_used": result.get("qubits_used", 0),
                            "quantum_volume": result.get("quantum_volume", 0),
                            "circuit_depth": result.get("circuit_depth", 0),
                            "quantum_efficiency": result.get("quantum_efficiency", 0),
                            "coherence_time": result.get("coherence_time", 0),
                            "gate_fidelity": result.get("gate_fidelity", 0)
                        },
                        "sensitivity_metrics": {
                            "max_sensitivity_point": result.get("max_sensitivity_point", 0),
                            "curve_steepness": result.get("curve_steepness", 0),
                            "risk_return_ratio": result.get("risk_return_ratio", 0),
                            "portfolio_beta": result.get("portfolio_beta", 0),
                            "var_95": result.get("var_95", 0),
                            "expected_shortfall": result.get("expected_shortfall", 0)
                        }
                    },
                    "noira_analysis": {
                        "analysis_id": f"analysis-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                        "messages": []
                    }
                }
                
                test_run_id = file_manager.save_test_run(project_id, test_run_data)
                result["test_run_id"] = test_run_id
                result["saved_to_file"] = True
                
                # Update project with test run reference
                project_name = data.get('project_name')
                if project_name:
                    file_manager.update_project_test_runs(project_name, test_run_id)
                
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
                test_run_data = {
                    "block_type": "classical",
                    "parameters": {
                        "portfolio": portfolio,
                        "param": param,
                        "asset": asset,
                        "range": range_vals,
                        "steps": steps
                    },
                    "results": result,
                    "analytics": {
                        "mode": "classical",
                        "performance_metrics": {
                            "total_execution_time": result.get("execution_time", 0),
                            "throughput": result.get("throughput", 0),
                            "steps_processed": steps,
                            "memory_usage_mb": result.get("memory_usage", 0),
                            "cpu_usage_percent": result.get("cpu_usage", 0)
                        },
                        "statistical_metrics": {
                            "confidence_interval_95": result.get("confidence_interval", [0, 0]),
                            "coefficient_of_variation": result.get("coefficient_of_variation", 0),
                            "skewness": result.get("skewness", 0),
                            "kurtosis": result.get("kurtosis", 0),
                            "standard_error": result.get("standard_error", 0),
                            "statistical_significance": result.get("statistical_significance", 0)
                        },
                        "classical_metrics": {
                            "simulations_per_second": result.get("simulations_per_second", 0),
                            "iterations_per_second": result.get("iterations_per_second", 0),
                            "convergence_rate": result.get("convergence_rate", 0),
                            "monte_carlo_efficiency": result.get("monte_carlo_efficiency", 0)
                        },
                        "sensitivity_metrics": {
                            "max_sensitivity_point": result.get("max_sensitivity_point", 0),
                            "curve_steepness": result.get("curve_steepness", 0),
                            "risk_return_ratio": result.get("risk_return_ratio", 0),
                            "portfolio_beta": result.get("portfolio_beta", 0),
                            "var_95": result.get("var_95", 0),
                            "expected_shortfall": result.get("expected_shortfall", 0)
                        }
                    },
                    "noira_analysis": {
                        "analysis_id": f"analysis-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                        "messages": []
                    }
                }
                
                test_run_id = file_manager.save_test_run(project_id, test_run_data)
                result["test_run_id"] = test_run_id
                result["saved_to_file"] = True
                
                # Update project with test run reference
                project_name = data.get('project_name')
                if project_name:
                    file_manager.update_project_test_runs(project_name, test_run_id)
                
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
                test_run_data = {
                    "block_type": "hybrid",
                    "parameters": {
                        "portfolio": portfolio,
                        "param": param,
                        "asset": asset,
                        "range": range_vals,
                        "steps": steps
                    },
                    "results": result,
                    "analytics": {
                        "mode": "hybrid",
                        "performance_metrics": {
                            "total_execution_time": result.get("execution_time", 0),
                            "throughput": result.get("throughput", 0),
                            "steps_processed": steps,
                            "memory_usage_mb": result.get("memory_usage", 0),
                            "cpu_usage_percent": result.get("cpu_usage", 0)
                        },
                        "statistical_metrics": {
                            "confidence_interval_95": result.get("confidence_interval", [0, 0]),
                            "coefficient_of_variation": result.get("coefficient_of_variation", 0),
                            "skewness": result.get("skewness", 0),
                            "kurtosis": result.get("kurtosis", 0),
                            "standard_error": result.get("standard_error", 0),
                            "statistical_significance": result.get("statistical_significance", 0)
                        },
                        "hybrid_metrics": {
                            "quantum_classical_ratio": result.get("quantum_classical_ratio", 0),
                            "hybrid_efficiency": result.get("hybrid_efficiency", 0),
                            "optimization_iterations": result.get("optimization_iterations", 0),
                            "convergence_threshold": result.get("convergence_threshold", 0)
                        },
                        "sensitivity_metrics": {
                            "max_sensitivity_point": result.get("max_sensitivity_point", 0),
                            "curve_steepness": result.get("curve_steepness", 0),
                            "risk_return_ratio": result.get("risk_return_ratio", 0),
                            "portfolio_beta": result.get("portfolio_beta", 0),
                            "var_95": result.get("var_95", 0),
                            "expected_shortfall": result.get("expected_shortfall", 0)
                        }
                    },
                    "noira_analysis": {
                        "analysis_id": f"analysis-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                        "messages": []
                    }
                }
                
                test_run_id = file_manager.save_test_run(project_id, test_run_data)
                result["test_run_id"] = test_run_id
                result["saved_to_file"] = True
                
                # Update project with test run reference
                project_name = data.get('project_name')
                if project_name:
                    file_manager.update_project_test_runs(project_name, test_run_id)
                
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
        projects = file_manager.list_projects()
        return jsonify({
            "success": True,
            "projects": projects,
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
    project_id = data.get('project_id')
    
    if not name:
        return jsonify({
            "success": False,
            "error": "Project name is required",
            "timestamp": datetime.now().isoformat()
        }), 400
    
    try:
        project_config = file_manager.create_project(name, project_id)
        return jsonify({
            "success": True,
            "project": project_config,
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

@app.route('/api/projects/<project_name>', methods=['DELETE'])
def delete_project(project_name):
    """Delete a project"""
    try:
        success = file_manager.delete_project(project_name)
        if success:
            return jsonify({
                "success": True,
                "message": "Project deleted successfully",
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

@app.route('/api/projects/<project_name>/state', methods=['GET'])
def get_project_state(project_name):
    """Get complete project state including all test runs"""
    try:
        project_state = file_manager.get_project_state(project_name)
        if project_state:
            return jsonify({
                "success": True,
                "project_state": project_state,
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

@app.route('/api/projects/<project_name>/state', methods=['PUT'])
def save_project_state(project_name):
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
        success = file_manager.save_project_state(project_name, project_state)
        if success:
            return jsonify({
                "success": True,
                "message": "Project state saved successfully",
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
        test_runs = file_manager.list_test_runs(project_id)
        return jsonify({
            "success": True,
            "test_runs": test_runs,
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
        test_run_data = file_manager.load_test_run(test_run_id)
        if test_run_data:
            return jsonify({
                "success": True,
                "test_run": test_run_data,
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
        success = file_manager.delete_test_run(test_run_id)
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
    app.run(debug=True, port=5001)
