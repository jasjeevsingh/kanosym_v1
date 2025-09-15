#!/usr/bin/env python3
"""
Simple test to check if the backend server can start
"""

try:
    from flask import Flask
    print("✓ Flask imported successfully")
    
    app = Flask(__name__)
    print("✓ Flask app created")
    
    @app.route('/test')
    def test():
        return "Backend is working!"
    
    print("✓ Test route added")
    print("✓ Starting server on port 5001...")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()