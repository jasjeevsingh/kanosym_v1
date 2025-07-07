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
cd kanosym_v1/kanosym
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
pip install qiskit flask fastapi uvicorn numpy pandas matplotlib seaborn
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory (from kanosym root)
cd frontend

# Install Node.js dependencies
npm install
```

## Running the Application

### Option 1: Web Application

1. **Start the Backend Server:**
```bash
cd backend
# Activate virtual environment if not already active
source venv/bin/activate  # On macOS/Linux
# venv\Scripts\activate   # On Windows

# Start the API server
python api.py
```

2. **Start the Frontend Development Server:**
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Start the development server
npm run dev
```

3. **Access the Application:**
   - Open your browser and navigate to `http://localhost:5173` (or the port shown in terminal)

### Option 2: Electron Desktop Application

1. **Start the Backend Server:**
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
python api.py
```

2. **Build and Run Electron App:**
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Build the application
npm run build

# Start Electron application
npm run electron
```

## Development Commands

### Backend
- `python api.py` - Start the API server
- `python -m pytest` - Run backend tests (if available)

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run electron` - Start Electron application

## Troubleshooting

### Common Issues

1. **Port Conflicts:** If the default ports are in use, the applications will automatically try alternative ports or display an error message.

2. **Python Dependencies:** If you encounter issues with Qiskit installation, ensure you have the latest pip version:
   ```bash
   pip install --upgrade pip
   ```

3. **Node.js Issues:** If npm install fails, try clearing the cache:
   ```bash
   npm cache clean --force
   npm install
   ```

4. **Virtual Environment:** Always ensure your Python virtual environment is activated when running backend commands.

## Architecture Overview

## Folder Structure

```
kanosym/
├── backend/
│   ├── qae_engine.py
│   ├── metrics.py
│   ├── perturb.py
│   └── api.py
├── frontend/
│   ├── components/
│   │   ├── PortfolioInput.tsx
│   │   ├── PerturbControls.tsx
│   │   ├── ResultsChart.tsx
│   │   └── NoiraPanel.tsx
│   ├── App.tsx
│   └── main.css
└── README.md
```

## Backend
- Python, Qiskit, modular design for portfolio parsing, perturbation, QAE, metrics, and API.

## Frontend
- React, Tailwind CSS, drag-and-drop UI, results visualization, and narrative panel.
