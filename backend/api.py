"""
api.py

Backend API entry point for KANOSYM. Exposes endpoints for portfolio input, perturbation, QAE, and results formatting.
"""

from flask import Flask, request, jsonify, send_from_directory, make_response
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
import math
from price_data import get_asset_volatility
from price_data import fetch_correlation_matrix
from utils import check_correlation_perturbation_validity

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize file manager
file_manager = FileManager()

# Set up logger
logger = logging.getLogger("kanosym")
logging.basicConfig(level=logging.INFO)

# Custom logger to filter out polling noise
class FilteredRequestHandler(werkzeug.serving.WSGIRequestHandler):
    def log_request(self, code='-', size='-'):
        # Filter out polling endpoint logs
        if self.path and any(endpoint in self.path for endpoint in [
            '/thinking-status',
            '/api/projects HTTP',  # Project list polling
            '/api/projects/',  # Project details polling
            '/last-modified',  # Last modified polling
            '/api/test-runs HTTP'  # Test run list polling
        ]):
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
    
    # Convert all values in correlation_matrix to float to avoid TypeError
    if correlation_matrix:
        correlation_matrix = [
            [float(val) for val in row]
            for row in correlation_matrix
        ]
    
    # Convert all values to float to avoid dtype errors
    if weights:
        weights = [float(w) for w in weights]
        portfolio['weights'] = weights
    if volatility:
        volatility = [float(v) for v in volatility]
        portfolio['volatility'] = volatility
    if correlation_matrix:
        correlation_matrix = [
            [float(val) for val in row]
            for row in correlation_matrix
        ]
        portfolio['correlation_matrix'] = correlation_matrix
    
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
            return False, "Weight test range must be between 0 and 1 (weights cannot be negative)"
    elif param == 'volatility':
        if min_val <= 0 or max_val <= 0:
            return False, "Volatility test range must contain only positive values (volatility cannot be zero or negative)"
    elif param == 'correlation':
        if min_val < -0.5 or max_val > 0.5:
            return False, "Correlation delta perturbation range must be between -0.5 and 0.5 (large deltas can create invalid correlation matrices)"
    
    # Validate steps
    if steps < 2 or steps > 20:
        return False, "Steps must be between 2 and 20"
    
    return True, ""

def sanitize_for_json(obj):
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [sanitize_for_json(x) for x in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    else:
        return obj

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
    use_tools = data.get('use_tools', True)  # Default to using tools
    
    if not message:
        return jsonify({"success": False, "message": "Message is required"}), 400
    
    # Use the consolidated send_message method
    result = chat_controller.send_message(message, context, use_tools)
    
    return jsonify(result), 200 if result['success'] else 400

@app.route('/api/chat/send/stream', methods=['POST', 'OPTIONS'])
def send_message_stream():
    """Send a message to Noira and stream the response."""
    from flask import Response, stream_with_context
    import json
    from queue import Queue, Empty
    from threading import Thread

    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response
    
    data = request.get_json()
    message = data.get('message')
    context = data.get('context', {})
    use_tools = data.get('use_tools', True)
    
    if not message:
        return jsonify({"success": False, "message": "Message is required"}), 400
    
    def generate():
        # Queue for inter-thread communication
        event_queue: "Queue[dict]" = Queue()

        # Callback that the chat controller will invoke after each tool finishes
        def tool_cb(name: str, summary: str):
            event_queue.put({'type': 'tool_call', 'tool_name': name, 'summary': summary})

        # Container to capture the final result from the background thread
        result_container: dict = {}

        def run_chat():
            result_container['result'] = chat_controller.send_message(
                message,
                context,
                use_tools,
                tool_callback=tool_cb
            )

        # Start background processing
        thread = Thread(target=run_chat, daemon=True)
        thread.start()

        # Immediately send a start event
        yield f"data: {json.dumps({'type': 'start', 'timestamp': datetime.now().isoformat()})}\n\n"

        # Continuously yield events from the queue while the thread is alive or queue has items
        while True:
            try:
                event = event_queue.get(timeout=0.25)
                yield f"data: {json.dumps(event)}\n\n"
            except Empty:
                # If the worker thread is done and queue is empty, exit loop
                if not thread.is_alive():
                    break

        # Ensure the background thread has completed
        thread.join()

        result = result_container.get('result', {})

        # Send the final response or error
        if result.get('success'):
            yield f"data: {json.dumps({'type': 'response', 'content': result.get('response', ''), 'timestamp': result.get('timestamp')})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'error', 'message': result.get('message', 'Unknown error')})}\n\n"

        # Completion signal
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Access-Control-Allow-Origin': '*'
        }
    )

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
    logger.info(f"[QUANTUM] Incoming request data: {data}")
    portfolio = data.get('portfolio')
    param = data.get('param')
    asset = data.get('asset')
    range_vals = data.get('range')
    steps = data.get('steps')
    use_noise_model = data.get('use_noise_model', False)  # Extract noise model parameter
    noise_model_type = data.get('noise_model_type', 'fast')  # Extract noise model type
    project_id = data.get('project_id')  # New: project_id for autosave
    
    # Validate portfolio
    is_valid, error_msg = validate_portfolio(portfolio)
    if not is_valid:
        logger.error(f"[QUANTUM] Portfolio validation failed: {error_msg}")
        return jsonify({"success": False, "error": error_msg}), 400
    
    # Validate sensitivity parameters
    is_valid, error_msg = validate_sensitivity_params(param, asset, range_vals, steps, portfolio)
    if not is_valid:
        logger.error(f"[QUANTUM] Sensitivity param validation failed: {error_msg}")
        return jsonify({"success": False, "error": error_msg}), 400
    
    try:
        result = quantum_sensitivity_test(
            portfolio=portfolio,
            param=param,
            asset=asset,
            range_vals=range_vals,
            steps=steps,
            use_noise_model=use_noise_model,
            noise_model_type=noise_model_type
        )
        logger.info(f"[QUANTUM] Model result: {result}")
        
        # Auto-save test run if project_id is provided
        if project_id:
            try:
                # Save test run data in the same format as returned to frontend
                test_run_data = {
                    **result,  # Include all result data at the top level
                    "block_type": "quantum",
                    "parameters": {
                        "portfolio": portfolio,
                        "param": param,
                        "asset": asset,
                        "range": range_vals,
                        "steps": steps
                    },
                    "analytics": result.get("analytics", {}),
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
        
        # Sanitize for JSON
        result = sanitize_for_json(result)
        # Add success field to indicate the test completed successfully
        result["success"] = True
        return jsonify(result)
    except Exception as e:
        logger.error(f"[QUANTUM] Exception: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/classical_sensitivity_test', methods=['POST'])
def classical_sensitivity_test_api():
    data = request.get_json()
    logger.info(f"[CLASSICAL] Incoming request data: {data}")
    portfolio = data.get('portfolio')
    param = data.get('param')
    asset = data.get('asset')
    range_vals = data.get('range')
    steps = data.get('steps')
    project_id = data.get('project_id')  # New: project_id for autosave
    
    # Validate portfolio
    is_valid, error_msg = validate_portfolio(portfolio)
    if not is_valid:
        logger.error(f"[CLASSICAL] Portfolio validation failed: {error_msg}")
        return jsonify({"success": False, "error": error_msg}), 400
    
    # Validate sensitivity parameters
    is_valid, error_msg = validate_sensitivity_params(param, asset, range_vals, steps, portfolio)
    if not is_valid:
        logger.error(f"[CLASSICAL] Sensitivity param validation failed: {error_msg}")
        return jsonify({"success": False, "error": error_msg}), 400
    
    try:
        result = classical_sensitivity_test(
            portfolio=portfolio,
            param=param,
            asset=asset,
            range_vals=range_vals,
            steps=steps
        )
        logger.info(f"[CLASSICAL] Model result: {result}")
        
        # Auto-save test run if project_id is provided
        if project_id:
            try:
                # Save test run data in the same format as returned to frontend
                test_run_data = {
                    **result,  # Include all result data at the top level
                    "block_type": "classical",
                    "parameters": {
                        "portfolio": portfolio,
                        "param": param,
                        "asset": asset,
                        "range": range_vals,
                        "steps": steps
                    },
                    "analytics": result.get("analytics", {}),
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
        
        # Sanitize for JSON
        result = sanitize_for_json(result)
        # Add success field to indicate the test completed successfully
        result["success"] = True
        return jsonify(result)
    except Exception as e:
        logger.error(f"[CLASSICAL] Exception: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/hybrid_sensitivity_test', methods=['POST'])
def hybrid_sensitivity_test_api():
    data = request.get_json()
    logger.info(f"[HYBRID] Incoming request data: {data}")
    portfolio = data.get('portfolio')
    param = data.get('param')
    asset = data.get('asset')
    range_vals = data.get('range')
    steps = data.get('steps')
    project_id = data.get('project_id')  # New: project_id for autosave
    
    # Validate portfolio
    is_valid, error_msg = validate_portfolio(portfolio)
    if not is_valid:
        logger.error(f"[HYBRID] Portfolio validation failed: {error_msg}")
        return jsonify({"success": False, "error": error_msg}), 400
    
    # Validate sensitivity parameters
    is_valid, error_msg = validate_sensitivity_params(param, asset, range_vals, steps, portfolio)
    if not is_valid:
        logger.error(f"[HYBRID] Sensitivity param validation failed: {error_msg}")
        return jsonify({"success": False, "error": error_msg}), 400
    
    try:
        result = hybrid_sensitivity_test(
            portfolio=portfolio,
            param=param,
            asset=asset,
            range_vals=range_vals,
            steps=steps
        )
        logger.info(f"[HYBRID] Model result: {result}")
        
        # Auto-save test run if project_id is provided
        if project_id:
            try:
                # Save test run data in the same format as returned to frontend
                test_run_data = {
                    **result,  # Include all result data at the top level
                    "block_type": "hybrid",
                    "parameters": {
                        "portfolio": portfolio,
                        "param": param,
                        "asset": asset,
                        "range": range_vals,
                        "steps": steps
                    },
                    "analytics": result.get("analytics", {}),
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
        
        # Sanitize for JSON
        result = sanitize_for_json(result)
        # Add success field to indicate the test completed successfully
        result["success"] = True
        return jsonify(result)
    except Exception as e:
        logger.error(f"[HYBRID] Exception: {e}")
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

@app.route('/api/projects/<project_name>/last-modified', methods=['GET'])
def get_project_last_modified(project_name):
    """Get the last modified timestamp of a project"""
    try:
        project_config = file_manager.load_project(project_name)
        if not project_config:
            return jsonify({
                "success": False,
                "error": "Project not found",
                "timestamp": datetime.now().isoformat()
            }), 404
        
        return jsonify({
            "success": True,
            "last_modified": project_config.get("metadata", {}).get("last_modified"),
            "timestamp": datetime.now().isoformat()
        })
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
        # Suppress logs for polling requests (they don't have project_id)
        suppress_logs = project_id is None
        test_runs = file_manager.list_test_runs(project_id, suppress_logs=suppress_logs)
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
        # Load existing project configuration
        project_config = file_manager.load_project(project_name)
        if not project_config:
            return jsonify({
                "success": False,
                "error": "Project not found",
                "timestamp": datetime.now().isoformat()
            }), 404
        
        # Debug: Log what blocks are being received
        if 'blocks' in project_state:
            print(f"Autosave for {project_name} - Received blocks:")
            for block_type, block_data in project_state['blocks'].items():
                print(f"  {block_type}: placed={block_data.get('placed')}, position={block_data.get('position')}, has_params={block_data.get('parameters') is not None}")
        
        # Merge the state into the configuration
        if 'blocks' in project_state:
            project_config['configuration']['blocks'] = project_state['blocks']
        if 'ui_state' in project_state:
            project_config['configuration']['ui_state'] = project_state['ui_state']
        # For results, only update current_tab to avoid overwriting test_runs
        if 'results' in project_state and 'current_tab' in project_state['results']:
            project_config['results']['current_tab'] = project_state['results']['current_tab']
        
        # Debug: Log what blocks are being saved
        print(f"Autosave for {project_name} - Saving blocks:")
        for block_type, block_data in project_config['configuration']['blocks'].items():
            print(f"  {block_type}: placed={block_data.get('placed')}, position={block_data.get('position')}, has_params={block_data.get('parameters') is not None}")
        
        # Save the updated configuration
        success = file_manager.save_project(project_name, project_config)
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

@app.route('/api/fetch_volatility', methods=['POST'])
def fetch_volatility():
    """
    Fetch historical volatility for a list of asset symbols.
    Expects JSON: {"symbols": ["AAPL", "GOOGL"], "start": "2023-01-01", "end": "2024-01-01", "window": 252}
    """
    data = request.get_json()
    symbols = data.get('symbols')
    start = data.get('start')
    end = data.get('end')
    window = data.get('window', 252)

    if not symbols or not isinstance(symbols, list):
        return jsonify({"success": False, "error": "'symbols' must be a list of asset symbols."}), 400
    if not start or not end:
        return jsonify({"success": False, "error": "'start' and 'end' dates are required."}), 400

    results = {}
    for symbol in symbols:
        try:
            vol = get_asset_volatility(symbol, start, end, window)
            if vol is not None:
                results[symbol] = round(vol, 4)
            else:
                results[symbol] = "Insufficient data or error."
        except Exception as e:
            results[symbol] = f"Error: {str(e)}"

    return jsonify({"success": True, "volatility": results})

@app.route('/api/fetch_correlation_matrix', methods=['POST'])
def fetch_correlation_matrix_api():
    """
    Fetch correlation matrix for a list of asset symbols.
    Expects JSON: {"symbols": ["AAPL", "GOOGL"], "start": "2023-01-01", "end": "2024-01-01", "frequency": "1d"}
    """
    data = request.get_json()
    symbols = data.get('symbols')
    start = data.get('start')
    end = data.get('end')
    frequency = data.get('frequency', '1d')

    if not symbols or not isinstance(symbols, list) or len(symbols) < 2:
        return jsonify({"success": False, "error": "At least two symbols are required."}), 400
    if not start or not end:
        return jsonify({"success": False, "error": "Start and end dates are required."}), 400

    matrix = fetch_correlation_matrix(symbols, start, end, frequency)
    if matrix is None:
        return jsonify({"success": False, "error": "Insufficient data or error."}), 200
    
    # Round each value in the correlation matrix to 4 decimal places
    rounded_matrix = [[round(val, 4) for val in row] for row in matrix]
    
    return jsonify({"success": True, "correlation_matrix": rounded_matrix})

@app.route('/api/check_correlation_validity', methods=['POST'])
def check_correlation_validity_api():
    data = request.get_json()
    correlation_matrix = data.get('correlation_matrix')
    asset_idx = data.get('asset_idx')
    range_vals = data.get('range_vals')
    steps = data.get('steps')
    # Debug logging
    print(f"[DEBUG] Received /api/check_correlation_validity request: asset_idx={asset_idx}, range_vals={range_vals}, steps={steps}")
    if correlation_matrix is None or asset_idx is None or range_vals is None or steps is None:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    try:
        result = check_correlation_perturbation_validity(
            correlation_matrix=correlation_matrix,
            asset_idx=asset_idx,
            range_vals=tuple(range_vals),
            steps=steps
        )
        print(f"[DEBUG] Correlation validity result: invalid_min={result.get('invalid_min')}, invalid_max={result.get('invalid_max')}, invalid_indices_count={len(result.get('invalid_indices', []))}")
        return jsonify({'success': True, **result})
    except Exception as e:
        print(f"[DEBUG] Error during correlation validity check: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

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

class WerkzeugFilter(logging.Filter):
    """Filter out polling endpoint logs from werkzeug"""
    def filter(self, record):
        # Check if this is a werkzeug access log
        if record.name == 'werkzeug' and hasattr(record, 'args'):
            # Convert args to string to check the message content
            message = str(record.getMessage())
            # Filter out polling endpoints
            if any(endpoint in message for endpoint in [
                '"GET /api/projects HTTP',
                '"GET /api/projects/',
                '/last-modified HTTP',
                '/thinking-status HTTP',
                '"GET /api/test-runs HTTP'
            ]):
                return False
        return True

if __name__ == '__main__':
    # Add filter to werkzeug logger
    werkzeug_logger = logging.getLogger('werkzeug')
    werkzeug_logger.addFilter(WerkzeugFilter())
    
    # Run the app
    app.run(debug=True, port=5001)
