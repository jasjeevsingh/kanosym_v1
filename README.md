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
cd kanosym_v1
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

**Important:** Make sure `npm install` completes successfully. This installs critical dependencies like `recharts` for data visualization.

## Running the Application

KANOSYM requires **multiple components** to be running simultaneously. Follow this **exact startup order**:

### Step 1: Start Backend Server (Terminal 1)
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

### Step 2: Start Frontend Dev Server (Terminal 2)
```bash
# Navigate to frontend directory
cd frontend

# Start the Vite development server
npm run dev
```
**Expected output:** Vite server running on `http://localhost:5173`

**⚠️ Wait for this to complete before starting Electron!**

### Step 3: Start Electron App (Terminal 3) - OPTIONAL
```bash
# Navigate to frontend directory (same as Terminal 2)
cd frontend

# Start the Electron application
npm run electron
```
**Expected output:** Electron app window opens, loading the frontend from `http://localhost:5173`

## Access Options

### Option 1: Web Browser (Recommended)
- Open your browser and navigate to `http://localhost:5173`
- Requires only Terminals 1 and 2 to be running
- **This is the easiest way to use KANOSYM**

### Option 2: Electron Desktop App
- The Electron app will automatically open when you run `npm run electron`
- Requires **all three terminals** to be running
- **Must start Vite dev server BEFORE starting Electron**

## Development Commands

### Backend (from `backend/` directory)
- `python api.py` - Start the Flask API server
- `pip install -r requirements.txt` - Install Python dependencies
- `python test_server.py` - Run basic backend test

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

1. **Electron "could not load localhost:5173" Error:**
   ```bash
   # SOLUTION: Start Vite dev server FIRST, then Electron
   cd frontend
   npm run dev          # Wait for "Local: http://localhost:5173/"
   npm run electron     # In a separate terminal
   ```

2. **"Failed to resolve import 'recharts'" Error:**
   ```bash
   # SOLUTION: Reinstall dependencies
   cd frontend
   npm install
   ```

3. **Port Conflicts:** 
   - If port 5001 is in use, Flask will show an error
   - If port 5173 is in use, Vite will automatically try the next available port

4. **Python Dependencies Issues:** 
   ```bash
   # If you encounter Qiskit installation issues:
   cd backend
   pip install --upgrade pip
   pip uninstall qiskit qiskit-aer  # Remove problematic versions
   pip install -r requirements.txt
   ```

5. **Node.js Issues:** 
   ```bash
   # If npm install fails:
   cd frontend
   npm cache clean --force
   npm install
   ```

6. **Virtual Environment:** 
   - Always ensure your Python virtual environment is activated when running backend commands
   - You should see `(venv)` in your terminal prompt

7. **Connection Issues:**
   - Ensure backend is running on port 5001 and frontend on port 5173
   - The frontend will show connection errors if the backend isn't running
   - Check browser console (F12) for detailed error messages

8. **ImportError: cannot import name 'BaseSampler':**
   ```bash
   # This indicates version compatibility issues - backend should work with current requirements.txt
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   ```

## Quick Test

To verify everything is working:

1. **Test Backend:**
   ```bash
   cd backend
   source venv/bin/activate
   python -c "from quantum_sensitivity.engine import quantum_sensitivity_test; print('Backend OK')"
   ```

2. **Test Frontend:**
   ```bash
   cd frontend
   npm run dev
   # Should see: "Local: http://localhost:5173/"
   ```

3. **Test Full System:**
   - Open browser to `http://localhost:5173`
   - You should see the KANOSYM interface
   - Try creating a simple portfolio and running sensitivity analysis

## Architecture Overview

### Folder Structure
```
kanosym_v1/
├── backend/
│   ├── quantum_sensitivity/
│   │   ├── engine.py
│   │   ├── perturbation.py
│   │   ├── qae_engine.py
│   │   ├── metrics.py
│   │   └── format_output.py
│   ├── api.py
│   ├── chat_controller.py
│   ├── test_server.py
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
├── README.md
└── README_CHAT_SETUP.md
```

### Backend
- **Flask API** with endpoints for classical, hybrid, and quantum sensitivity tests
- **Qiskit integration** for quantum computing simulations
- **Modular design** for portfolio parsing, perturbation, QAE, and metrics
- **Chat integration** with OpenAI API for AI assistance

### Frontend
- **React + TypeScript** with Vite for fast development
- **Tailwind CSS** for styling
- **Drag-and-drop interface** for block-based modeling
- **Electron** for desktop application packaging
- **Real-time results visualization** with Recharts
- **AI chat integration** with Noira assistant

## API Endpoints

### Quantum Sensitivity Analysis
- `POST /api/quantum_sensitivity_test` - Run quantum-enhanced analysis
- `POST /api/classical_sensitivity_test` - Run classical Monte Carlo analysis  
- `POST /api/hybrid_sensitivity_test` - Run hybrid classical-quantum analysis

### Chat System
- `POST /api/chat/set-api-key` - Set OpenAI API key
- `GET /api/chat/status` - Get connection status
- `POST /api/chat/send` - Send message to AI assistant
- `POST /api/chat/reset` - Reset chat history
