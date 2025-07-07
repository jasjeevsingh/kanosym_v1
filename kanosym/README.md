# KANOSYM

KANOSYM is an intelligent financial modeling engine leveraging quantum-enhanced simulations to help finance professionals understand portfolio behavior under different market conditions. This MVP focuses on a sensitivity testing tool using Quantum Amplitude Estimation (QAE).

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
