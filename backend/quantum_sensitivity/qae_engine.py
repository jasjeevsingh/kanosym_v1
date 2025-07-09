# qae_engine.py
import numpy as np
from typing import Dict, Any
from qiskit import QuantumCircuit
from qiskit_aer import Aer
from qiskit.primitives import StatevectorSampler
from qiskit_algorithms import AmplitudeEstimation, EstimationProblem

def run_qae(portfolio_state: Dict[str, Any]) -> float:
    """
    QAE-based Sharpe ratio estimator using Qiskit.

    Expects:
        portfolio_state: {
            "weights": list[float],
            "volatility": list[float]
        }
    Returns:
        Estimated Sharpe ratio (float).
    """
    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    assert weights.shape == volatility.shape, "Weights and volatility must align"
    # Compute classical Sharpe value for normalization
    sharpe_cl = np.sum(weights) / np.sum(volatility)

    # Build amplitude-encoding circuit: encode sharpe_cl into amplitude of qubit 0
    qc = QuantumCircuit(1)
    theta = 2 * np.arcsin(min(1, max(0, sharpe_cl / 10)))  # arbitrary normalization
    qc.ry(theta, 0)

    # Set up QAE
    sampler = StatevectorSampler()
    ae = AmplitudeEstimation(num_eval_qubits=3, sampler=sampler)  # 3 eval qubits
    problem = EstimationProblem(
        state_preparation=qc,
        objective_qubits=[0]
    )

    result = ae.estimate(problem)
    a = float(result.estimation)  # estimated amplitude

    # Map back to Sharpe ratio scale
    sharpe_q = a * 10
    return float(np.round(sharpe_q, 4))
