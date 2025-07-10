"""
api.py

Backend API entry point for KANOSYM. Exposes endpoints for portfolio input, perturbation, QAE, and results formatting.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from noira.chat_controller import chat_controller
import os
from dotenv import load_dotenv
from model_blocks.quantum.quantum_sensitivity import quantum_sensitivity_test
from model_blocks.classical.classical_sensitivity import classical_sensitivity_test
from model_blocks.hybrid.hybrid_sensitivity import hybrid_sensitivity_test
import numpy as np
from datetime import datetime

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

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

@app.route('/api/chat/pending-responses', methods=['GET'])
def get_pending_responses():
    """Get all pending Noira responses"""
    try:
        pending = chat_controller.get_pending_responses()
        return jsonify({
            "success": True,
            "pending_responses": pending,
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error getting pending responses: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/chat/async-response/<analysis_id>', methods=['GET'])
def get_async_response(analysis_id):
    """Get a specific async Noira response by analysis ID"""
    try:
        response_data = chat_controller.get_async_response(analysis_id)
        if response_data:
            return jsonify({
                "success": True,
                "response_data": response_data,
                "timestamp": datetime.now().isoformat()
            })
        else:
            return jsonify({
                "success": False,
                "message": "No response found for this analysis ID",
                "timestamp": datetime.now().isoformat()
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error getting async response: {str(e)}",
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/chat/display-updates', methods=['GET'])
def get_display_updates():
    """Poll for display history updates"""
    client_id = request.args.get('client_id', 'default')
    full_history = request.args.get('full_history', 'false').lower() == 'true'
    
    result = chat_controller.get_display_updates(client_id, full_history)
    return jsonify(result)

@app.route('/api/chat/reset-display', methods=['POST'])
def reset_display_history():
    """Reset display history"""
    result = chat_controller.reset_display_history()
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
        return jsonify(result)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)  # Change to 5001
