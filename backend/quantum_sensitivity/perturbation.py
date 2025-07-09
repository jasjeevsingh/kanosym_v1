# perturbation.py
from typing import List, Dict, Any
import numpy as np

def perturb_portfolio(param: str, asset: str, range_vals: List[float], steps: int, portfolio: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate a list of perturbed portfolios by varying the selected parameter.
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