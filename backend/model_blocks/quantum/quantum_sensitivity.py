"""
quantum_sensitivity.py

Quantum Sensitivity Test Block for KANOSYM.
Contains all functions needed for quantum-enhanced portfolio sensitivity analysis.

This block performs sensitivity testing using Quantum Amplitude Estimation (QAE)
to analyze how portfolio performance changes when parameters are perturbed.
"""

import numpy as np
from typing import Dict, Any, List
from qiskit import QuantumCircuit, transpile
from qiskit_aer import Aer
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from analytics import AnalyticsCollector
import logging
from qiskit.circuit.library import WeightedAdder
from qiskit.algorithms import EstimationProblem
from qiskit.algorithms.amplitude_estimators import IterativeAmplitudeEstimation
from qiskit.utils import QuantumInstance


# Configure logging
logger = logging.getLogger(__name__)


def perturb_portfolio(param: str, asset: str, range_vals: List[float], steps: int, portfolio: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate a list of perturbed portfolios by varying the selected parameter.
    
    Args:
        param: Parameter to perturb ('volatility', 'weight', 'correlation')
        asset: Asset to perturb
        range_vals: [min_value, max_value] for perturbation range
        steps: Number of steps in the range
        portfolio: Original portfolio configuration
        
    Returns:
        List of perturbed portfolio configurations
    """
    perturbed = []
    values = np.linspace(range_vals[0], range_vals[1], steps)
    
    for val in values:
        p = {**portfolio}
        
        if param == 'volatility':
            idx = portfolio['assets'].index(asset)
            p['volatility'] = list(portfolio['volatility'])
            p['volatility'][idx] = val
            
        elif param == 'weight':
            idx = portfolio['assets'].index(asset)
            p['weights'] = list(portfolio['weights'])
            p['weights'][idx] = val
            # Optionally re-normalize weights here
            
        elif param == 'correlation':
            idx = portfolio['assets'].index(asset)
            p['correlation_matrix'] = [row[:] for row in portfolio['correlation_matrix']]
            for j in range(len(p['correlation_matrix'])):
                p['correlation_matrix'][idx][j] = val
                p['correlation_matrix'][j][idx] = val
                
        p['perturbed_value'] = val
        perturbed.append(p)
        
    return perturbed


def run_quantum_volatility(portfolio_state: Dict[str, Any]) -> dict:
    """
    Quantum volatility estimator using Qiskit's Iterative Amplitude Estimation (QAE).
    Uses WeightedAdder to encode contributions from asset volatilities and weights.
    Automatically determines number of value qubits needed.
    Supports up to 5 assets.
    """
    from qiskit import QuantumCircuit
    from qiskit.circuit.library import WeightedAdder
    from qiskit.algorithms import EstimationProblem
    from qiskit.algorithms.amplitude_estimators import IterativeAmplitudeEstimation
    from qiskit.utils import QuantumInstance
    from qiskit_aer import Aer
    import numpy as np

    weights = np.array(portfolio_state['weights'])
    volatility = np.array(portfolio_state['volatility'])
    correlation_matrix = np.array(portfolio_state['correlation_matrix'])
    n_assets = len(weights)

    if n_assets > 5:
        raise ValueError("Quantum volatility estimator supports up to 5 assets.")
    if n_assets < 2:
        raise ValueError("At least 2 assets are required.")

    # Classical portfolio variance (for scaling or validation)
    cov_matrix = np.outer(volatility, volatility) * correlation_matrix
    portfolio_variance = float(weights @ cov_matrix @ weights)
    max_variance = 1.0  # normalize to [0, 1]

    # --- Step 1: Compute scaled contributions and required value qubits ---
    scale_factor = 100  # Increased scaling for typical portfolio values
    scaled_contributions = np.round(weights * volatility * scale_factor).astype(int)
    if np.all(scaled_contributions == 0):
        raise ValueError("All scaled asset contributions are zero. Increase the scaling factor or check your portfolio weights/volatilities.")
    total_scaled = np.sum(scaled_contributions)
    
    # Qiskit expects: state (value) qubits first, then input (weight) qubits
    n_state_qubits = int(np.ceil(np.log2(total_scaled + 1)))
    n_weight_qubits = n_assets
    
    # Construct WeightedAdder first to get the actual number of qubits needed
    weights_list = scaled_contributions.tolist()
    print(f"weights_list: {weights_list}, type: {type(weights_list)}")
    print(f"weights_list length: {len(weights_list)}")
    print(f"sum of weights: {sum(weights_list)}")
    
    # Ensure we have enough state qubits to represent the sum of all weights
    required_state_qubits = int(np.ceil(np.log2(sum(weights_list) + 1)))
    n_state_qubits = max(n_state_qubits, required_state_qubits)
    print(f"required_state_qubits: {required_state_qubits}, final n_state_qubits: {n_state_qubits}")
    
    # Use a simpler approach: manual circuit construction
    n_weight_qubits = n_assets
    total_qubits = n_state_qubits + n_weight_qubits
    
    print(f"n_state_qubits: {n_state_qubits}, n_weight_qubits: {n_weight_qubits}, total_qubits: {total_qubits}")
    
    # Build quantum circuit with the correct number of qubits
    qc = QuantumCircuit(total_qubits, name="VolatilityEncoding")
    print(f"Main circuit created with {qc.num_qubits} qubits")

    # Apply Hadamards to the input qubits (last n_weight_qubits)
    for i in range(total_qubits - n_weight_qubits, total_qubits):
        qc.h(i)
    print(f"Applied Hadamards to qubits {list(range(total_qubits - n_weight_qubits, total_qubits))}")

    # Manual weighted addition using controlled operations
    print("Building manual weighted addition circuit...")
    for i, weight in enumerate(weights_list):
        if weight > 0:
            control_qubit = total_qubits - n_weight_qubits + i
            # Add weight to the state register using controlled operations
            for j in range(n_state_qubits):
                if weight & (1 << j):  # If bit j is set in weight
                    qc.ccx(control_qubit, j, (j + 1) % n_state_qubits)  # Simple carry logic
    
    print("Manual weighted addition circuit built successfully")

    # Objective qubit is the MSB of the value register (index n_state_qubits-1)
    objective_qubit = n_state_qubits - 1

    # --- Step 4: Run Amplitude Estimation ---
    backend = Aer.get_backend('aer_simulator')
    qi = QuantumInstance(backend, shots=1000)

    problem = EstimationProblem(
        state_preparation=qc,
        objective_qubits=[objective_qubit]
    )

    qae = IterativeAmplitudeEstimation(epsilon_target=0.01, alpha=0.05, quantum_instance=qi)
    result = qae.estimate(problem)
    est_amplitude = result.estimation

    # --- Step 5: Map estimated amplitude to volatility (heuristic) ---
    est_scaled = est_amplitude * max_variance
    est_volatility = np.sqrt(est_scaled)
    annualized_vol = est_volatility * np.sqrt(252)

    return {
        'portfolio_volatility_daily': float(est_volatility),
        'portfolio_volatility_annualized': float(annualized_vol),
        'raw_amplitude_estimate': float(est_amplitude),
        'scaled_volatility_input': scaled_contributions.tolist(),
        'value_qubits': n_state_qubits
    }


def quantum_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int
) -> Dict[str, Any]:
    """
    Main function for quantum sensitivity testing (volatility only).
    """
    analytics = AnalyticsCollector('quantum')
    analytics.start_collection()
    logger.info(f"Starting quantum sensitivity analysis: {param} for {asset}")

    # 1. Perturb the portfolio
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)

    # 2. Run quantum volatility for baseline (unperturbed)
    baseline_metrics = run_quantum_volatility(portfolio)
    baseline_daily = baseline_metrics['portfolio_volatility_daily']
    baseline_annualized = baseline_metrics['portfolio_volatility_annualized']

    # 3. Run quantum volatility for each perturbed portfolio
    results = []
    for p in perturbed_portfolios:
        metrics = run_quantum_volatility(p)
        # Calculate delta vs baseline
        delta_daily = metrics["portfolio_volatility_daily"] - baseline_daily
        delta_annualized = metrics["portfolio_volatility_annualized"] - baseline_annualized
        
        result = {
            "perturbed_value": p["perturbed_value"],
            "portfolio_volatility_daily": metrics["portfolio_volatility_daily"],
            "portfolio_volatility_annualized": metrics["portfolio_volatility_annualized"],
            "volatility": metrics["portfolio_volatility_daily"],  # Use daily volatility as the main metric
            "delta_vs_baseline": delta_daily  # Use daily volatility delta
        }
        results.append(result)
        analytics.add_result(result)

    # 4. End analytics collection
    analytics.end_collection()

    # 5. Format output with analytics
    output = format_output(
        perturbation=param,
        asset=asset,
        range_tested=list(np.linspace(range_vals[0], range_vals[1], steps)),
        baseline_portfolio_volatility_daily=baseline_daily,
        baseline_portfolio_volatility_annualized=baseline_annualized,
        results=results,
        analytics=analytics.get_analytics_summary()
    )

    logger.info(f"Quantum analysis complete")
    return output


def format_output(perturbation: str, asset: str, range_tested: List[float], baseline_portfolio_volatility_daily: float, baseline_portfolio_volatility_annualized: float, results: List[Dict[str, Any]], analytics: Dict[str, Any] = None) -> Dict[str, Any]:
    output = {
        "perturbation": perturbation,
        "asset": asset,
        "range_tested": range_tested,
        "baseline_portfolio_volatility_daily": baseline_portfolio_volatility_daily,
        "baseline_portfolio_volatility_annualized": baseline_portfolio_volatility_annualized,
        "results": results,
        "processing_mode": "quantum",
        "description": "Quantum-inspired simulation for portfolio sensitivity analysis (portfolio volatility only)"
    }
    if analytics:
        output["analytics"] = analytics
    return output 