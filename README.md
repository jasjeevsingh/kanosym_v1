# KANOSYM

KANOSYM is an intelligent financial modeling engine leveraging quantum-enhanced simulations to help finance professionals understand portfolio behavior under different market conditions. This MVP focuses on a sensitivity testing tool using Quantum Amplitude Estimation (QAE).

## Prerequisites

Before running KANOSYM, ensure you have the following installed:

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Git** (for cloning the repository)

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd kanosym_test1
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create a virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install Node.js dependencies
npm install
```

## Running the Application

KANOSYM requires **three components** to be running simultaneously. You'll need **three separate terminal windows**.

### Terminal 1: Flask Backend Server
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment (if not already active)
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate   # On Windows

# Start the Flask API server
python api.py
```
**Expected output:** Flask server running on `http://localhost:5001`

### Terminal 2: Frontend Development Server
```bash
# Navigate to frontend directory
cd frontend

# Start the Vite development server
npm run dev
```
**Expected output:** Vite server running on `http://localhost:5173`

### Terminal 3: Electron Desktop Application
```bash
# Navigate to frontend directory
cd frontend

# Start the Electron application
npm run electron
```
**Expected output:** Electron app window opens, loading the frontend from `http://localhost:5173`

## Access Options

### Option 1: Web Browser
- Open your browser and navigate to `http://localhost:5173`
- Requires Terminals 1 and 2 to be running

### Option 2: Electron Desktop App
- The Electron app will automatically open when you run `npm run electron`
- Requires all three terminals to be running

## Development Commands

### Backend (from `backend/` directory)
- `python api.py` - Start the Flask API server
- `pip install -r requirements.txt` - Install Python dependencies
- `python -m pytest` - Run backend tests (if available)

### Frontend (from `frontend/` directory)
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run electron` - Start Electron application

## Port Configuration

- **Flask Backend**: `http://localhost:5001`
- **Vite Frontend**: `http://localhost:5173`
- **Electron**: Loads frontend from `http://localhost:5173`

## Troubleshooting

### Common Issues

1. **Port Conflicts:** 
   - If port 5001 is in use, Flask will show an error
   - If port 5173 is in use, Vite will automatically try the next available port

2. **Python Dependencies:** 
   - If you encounter issues with Qiskit installation:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Node.js Issues:** 
   - If npm install fails:
   ```bash
   npm cache clean --force
   npm install
   ```

4. **Virtual Environment:** 
   - Always ensure your Python virtual environment is activated when running backend commands
   - You should see `(venv)` in your terminal prompt

5. **Connection Issues:**
   - Ensure all three terminals are running
   - Check that Flask is on port 5001 and Vite is on port 5173
   - The frontend will show connection errors if the backend isn't running

## Architecture Overview

### Folder Structure
```
kanosym_test1/
├── backend/
│   ├── quantum_sensitivity/
│   │   ├── engine.py
│   │   ├── perturbation.py
│   │   ├── qae_engine.py
│   │   ├── metrics.py
│   │   └── format_output.py
│   ├── api.py
│   ├── chat_controller.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── NoiraPanel.tsx
│   │   ├── PerturbControls.tsx
│   │   └── ResultsChart.tsx
│   ├── electron-main.cjs
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

### Backend
- **Flask API** with endpoints for classical, hybrid, and quantum sensitivity tests
- **Qiskit integration** for quantum computing simulations
- **Modular design** for portfolio parsing, perturbation, QAE, and metrics

### Frontend
- **React + TypeScript** with Vite for fast development
- **Tailwind CSS** for styling
- **Drag-and-drop interface** for block-based modeling
- **Electron** for desktop application packaging
- **Real-time results visualization** and AI chat integration
