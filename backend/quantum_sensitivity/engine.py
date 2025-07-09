# engine.py
from typing import Dict, Any
from .perturbation import perturb_portfolio
from .qae_engine import run_qae
from .metrics import compute_metrics
from .format_output import format_output
import numpy as np

def quantum_sensitivity_test(
    portfolio: Dict[str, Any],
    param: str,
    asset: str,
    range_vals: list,
    steps: int
) -> Dict[str, Any]:
    # 1. Perturb the portfolio
    perturbed_portfolios = perturb_portfolio(param, asset, range_vals, steps, portfolio)
    # 2. Run QAE for baseline (unperturbed)
    baseline_sharpe = run_qae(portfolio)
    # 3. Run QAE for each perturbed portfolio
    results = []
    for p in perturbed_portfolios:
        sharpe = run_qae(p)
        results.append({"perturbed_value": p["perturbed_value"], "sharpe": sharpe})
    # 4. Compute deltas
    metrics = compute_metrics(baseline_sharpe, results)
    # 5. Format output
    output = format_output(
        perturbation=param,
        asset=asset,
        range_tested=list(np.linspace(range_vals[0], range_vals[1], steps)),
        baseline_sharpe=baseline_sharpe,
        results=metrics
    )
    return output 