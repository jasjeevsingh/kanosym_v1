# qae_engine.py
from typing import Dict, Any
import numpy as np

def run_qae(portfolio_state: Dict[str, Any]) -> float:
    """
    Mock QAE: Simulate a Sharpe ratio based on volatility and weights.
    Replace with real Qiskit QAE logic later.
    """
    # Example: Sharpe = (sum(weights) / sum(volatility)) * 1.5 + noise
    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    sharpe = (np.sum(weights) / np.sum(volatility)) * 1.5
    sharpe += np.random.normal(0, 0.02)  # add a little noise
    return float(np.round(sharpe, 4)) 