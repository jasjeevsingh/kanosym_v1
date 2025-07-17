import numpy as np
from typing import List, Tuple, Dict

def check_correlation_perturbation_validity(
    correlation_matrix: List[List[float]],
    asset_idx: int,
    range_vals: Tuple[float, float],
    steps: int
) -> Dict[str, List[int]]:
    """
    For a given correlation matrix, asset index, perturbation range, and number of steps,
    return which step indices would result in invalid (non-positive semi-definite) matrices.

    Args:
        correlation_matrix: NxN correlation matrix (list of lists)
        asset_idx: Index of the asset to perturb
        range_vals: (min, max) tuple for perturbation delta
        steps: Number of steps in the range

    Returns:
        Dict with keys:
            'invalid_indices': list of step indices (0-based) that are invalid
            'invalid_min': number of consecutive invalid steps at the min side
            'invalid_max': number of consecutive invalid steps at the max side
    """
    # Ensure inputs are numeric (convert from strings if necessary)
    try:
        range_min = float(range_vals[0])
        range_max = float(range_vals[1])
    except Exception as _:
        raise ValueError("range_vals must contain numeric values")

    # Convert correlation matrix to float values to avoid string concatenation errors
    corr_numeric = [[float(x) for x in row] for row in correlation_matrix]

    values = np.linspace(range_min, range_max, steps)
    invalid_indices = []
    n = len(corr_numeric)
    for i, delta in enumerate(values):
        perturbed = [row[:] for row in corr_numeric]
        for j in range(n):
            if asset_idx != j:
                original_corr = corr_numeric[asset_idx][j]
                new_corr = original_corr + delta
                new_corr = max(-1, min(1, new_corr))
                perturbed[asset_idx][j] = new_corr
                perturbed[j][asset_idx] = new_corr
        try:
            eigvals = np.linalg.eigvals(np.array(perturbed))
            min_eig = np.min(eigvals.real)
            if min_eig < -0.01:
                invalid_indices.append(i)
        except Exception:
            invalid_indices.append(i)
    # Count consecutive invalids at min and max
    invalid_min = 0
    for idx in invalid_indices:
        if idx == invalid_min:
            invalid_min += 1
        else:
            break
    invalid_max = 0
    for idx in reversed(invalid_indices):
        if idx == steps - 1 - invalid_max:
            invalid_max += 1
        else:
            break
    return {
        'invalid_indices': invalid_indices,
        'invalid_min': invalid_min,
        'invalid_max': invalid_max
    } 