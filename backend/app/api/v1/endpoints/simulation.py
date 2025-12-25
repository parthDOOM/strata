"""
Monte Carlo simulation API endpoints.

Provides endpoints for running price path simulations using the C++ engine.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlmodel import Session

from app.core.db import get_session
from app.schemas.simulation import (
    SimulationError,
    SimulationRequest,
    SimulationResponse,
)
from app.services.simulation_service import (
    SimulationRequest as ServiceRequest,
    get_simulation_summary,
)

router = APIRouter(prefix="/simulation", tags=["Simulation"])

# Type alias for session dependency
SessionDep = Annotated[Session, Depends(get_session)]


def _run_simulation_sync(session: Session, request: ServiceRequest) -> dict:
    """
    Synchronous wrapper for simulation service.

    This runs in a thread pool to avoid blocking the async event loop.
    """
    return get_simulation_summary(session, request)


@router.post(
    "/monte-carlo",
    response_model=SimulationResponse,
    summary="Run Monte Carlo simulation",
    description="""
Run a Monte Carlo simulation using Geometric Brownian Motion (GBM).

The simulation:
1. Fetches historical price data for the specified ticker
2. Calculates annualized drift (μ) and volatility (σ) from log returns
3. Runs the C++ Monte Carlo engine with the computed parameters
4. Returns aggregated results (mean path, percentiles, histogram)

**Note:** The heavy computation runs in a thread pool to avoid blocking.
    """,
    responses={
        400: {"model": SimulationError, "description": "Validation error"},
        404: {"model": SimulationError, "description": "Ticker not found"},
        500: {"model": SimulationError, "description": "Engine error"},
    },
)
async def run_monte_carlo(
    request: SimulationRequest,
    session: SessionDep,
) -> SimulationResponse:
    """
    Run Monte Carlo price simulation.

    Args:
        request: Simulation parameters
        session: Database session (injected)

    Returns:
        Simulation results with mean path, percentiles, and histogram

    Raises:
        HTTPException: 400 for validation errors, 404 if ticker not found,
                      500 for engine errors
    """
    # Convert API request to service request
    service_request = ServiceRequest(
        ticker=request.ticker.upper(),
        start_date=request.start_date,
        end_date=request.end_date,
        num_simulations=request.num_simulations,
        num_steps=request.num_steps,
        histogram_bins=request.histogram_bins,
        seed=request.seed or 0,
    )

    try:
        # Run simulation in thread pool to avoid blocking async event loop
        # This is crucial because the C++ engine is CPU-bound
        result = await run_in_threadpool(
            _run_simulation_sync,
            session,
            service_request,
        )

        return SimulationResponse(**result)

    except ValueError as e:
        # Validation errors from simulation service
        error_msg = str(e)

        # Determine appropriate status code
        if "not found" in error_msg.lower() or "no price data" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )

    except ImportError as e:
        # C++ engine not built
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Monte Carlo engine not available: {e}. Please build the extension.",
        )

    except Exception as e:
        # Unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation failed: {e}",
        )


@router.get(
    "/health",
    summary="Check simulation engine health",
    description="Verify that the C++ Monte Carlo engine is available.",
)
async def check_engine_health() -> dict:
    """
    Check if the Monte Carlo engine is available.

    Returns:
        Status of the C++ engine
    """
    try:
        from app.engine import run_monte_carlo as engine_func

        if engine_func is None:
            return {
                "status": "unavailable",
                "message": "Engine not built. Run 'python scripts/build_extension.py'",
            }

        # Quick test run
        result = await run_in_threadpool(
            engine_func,
            s0=100.0,
            mu=0.08,
            sigma=0.20,
            num_simulations=100,
            num_steps=10,
            dt=1.0 / 252.0,
            histogram_bins=10,
            seed=42,
        )

        return {
            "status": "healthy",
            "engine_version": "0.1.0",
            "test_result": {
                "mean_final": result.final_price_mean,
                "std": result.final_price_std,
            },
        }

    except ImportError as e:
        return {
            "status": "unavailable",
            "message": f"Engine import failed: {e}",
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Engine test failed: {e}",
        }
