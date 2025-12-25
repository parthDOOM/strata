"""
Engine module for Monte Carlo simulations.

This module exposes the C++ Monte Carlo engine to Python.
The compiled extension should be placed in this directory.
"""

try:
    from .monte_carlo_engine import SimulationResult, run_monte_carlo

    __all__ = ["SimulationResult", "run_monte_carlo"]

except ImportError as e:
    import warnings

    warnings.warn(
        f"Monte Carlo engine not available: {e}. "
        "Run 'python backend/scripts/build_extension.py' to build.",
        ImportWarning,
        stacklevel=2,
    )

    # Provide stub for type hints
    SimulationResult = None
    run_monte_carlo = None

    __all__ = []
