# format_output.py
from typing import List, Dict, Any

def format_output(perturbation: str, asset: str, range_tested: List[float], baseline_sharpe: float, results: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "perturbation": perturbation,
        "asset": asset,
        "range_tested": range_tested,
        "baseline_sharpe": baseline_sharpe,
        "results": results
    } 