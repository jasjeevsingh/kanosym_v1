"""
model_blocks package

Contains all the model blocks for KANOSYM.
Each block is organized in its own folder with all necessary functions.

Available blocks:
- quantum: Quantum Amplitude Estimation (QAE) for portfolio analysis
- classical: Monte Carlo simulation for portfolio analysis  
- hybrid: Classical-quantum hybrid approach for portfolio analysis

Utilities:
- noira_utils: Integration with Noira chat system for automatic explanations
"""

from .quantum.quantum_sensitivity import quantum_sensitivity_test
from .classical.classical_sensitivity import classical_sensitivity_test
from .hybrid.hybrid_sensitivity import hybrid_sensitivity_test
from .noira_utils import send_message_to_noira, format_analysis_summary

__all__ = [
    'quantum_sensitivity_test',
    'classical_sensitivity_test', 
    'hybrid_sensitivity_test',
    'send_message_to_noira',
    'format_analysis_summary'
] 