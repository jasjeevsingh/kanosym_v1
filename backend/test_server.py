from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/test')
def test():
    return {"message": "Backend is working!"}

if __name__ == '__main__':
    app.run(debug=True, port=5000) 