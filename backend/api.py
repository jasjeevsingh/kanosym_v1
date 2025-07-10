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

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

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
    result = quantum_sensitivity_test(
        portfolio=portfolio,
        param=param,
        asset=asset,
        range_vals=range_vals,
        steps=steps
    )
    return jsonify(result)

@app.route('/api/classical_sensitivity_test', methods=['POST'])
def classical_sensitivity_test_api():
    data = request.get_json()
    portfolio = data.get('portfolio')
    param = data.get('param')
    asset = data.get('asset')
    range_vals = data.get('range')
    steps = data.get('steps')
    result = classical_sensitivity_test(
        portfolio=portfolio,
        param=param,
        asset=asset,
        range_vals=range_vals,
        steps=steps
    )
    return jsonify(result)

@app.route('/api/hybrid_sensitivity_test', methods=['POST'])
def hybrid_sensitivity_test_api():
    data = request.get_json()
    portfolio = data.get('portfolio')
    param = data.get('param')
    asset = data.get('asset')
    range_vals = data.get('range')
    steps = data.get('steps')
    result = hybrid_sensitivity_test(
        portfolio=portfolio,
        param=param,
        asset=asset,
        range_vals=range_vals,
        steps=steps
    )
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5001)  # Change to 5001
