# metrics.py
from typing import List, Dict

def compute_metrics(base_result: float, results_list: List[Dict]) -> List[Dict]:
    """
    Compare each perturbed result to the baseline.
    Returns a list of dicts with perturbed value, metric, and delta.
    """
    output = []
    for r in results_list:
        val = r['perturbed_value']
        metric = r['sharpe']
        delta = metric - base_result
        output.append({
            'perturbed_value': val,
            'sharpe': metric,
            'delta_vs_baseline': delta
        })
    return output 