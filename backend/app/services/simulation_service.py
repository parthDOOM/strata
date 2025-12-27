"""
Simulation service for Monte Carlo price path simulations.

Implements "Gap Handling (Option B)" - validates and preprocesses
market data before passing to the C++ Monte Carlo engine.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date
from typing import TYPE_CHECKING

import polars as pl
from sqlmodel import Session, select

from app.models.market_data import DailyPrice

if TYPE_CHECKING:
    from app.engine import SimulationResult


# ==============================================================================
# Constants
# ==============================================================================

# Minimum required data points for reliable statistics
MIN_DATA_POINTS = 30

# Trading days per year (US market)
TRADING_DAYS_PER_YEAR = 252

# Daily time increment (as double precision - critical!)
DAILY_DT = 1.0 / 252.0


# ==============================================================================
# Data Classes
# ==============================================================================


@dataclass
class SimulationParams:
    """Validated parameters ready for simulation."""

    ticker: str
    s0: float  # Initial price
    mu: float  # Annualized drift
    sigma: float  # Annualized volatility
    num_data_points: int
    start_date: date
    end_date: date


@dataclass
class SimulationRequest:
    """Input request for running a simulation."""

    ticker: str
    start_date: date
    end_date: date
    num_simulations: int = 10_000
    num_steps: int = 252  # 1 year of trading days
    histogram_bins: int = 50
    seed: int = 0


# ==============================================================================
# Service Functions
# ==============================================================================


def fetch_price_data(
    session: Session,
    ticker: str,
    start_date: date,
    end_date: date,
) -> pl.DataFrame:
    """
    Fetch daily price data from the database.

    Args:
        session: SQLModel database session
        ticker: Ticker symbol
        start_date: Start date (inclusive)
        end_date: End date (inclusive)

    Returns:
        Polars DataFrame with columns [trade_date, adjusted_close]
        sorted by date ascending.
    """
    statement = (
        select(DailyPrice)
        .where(DailyPrice.symbol == ticker)
        .where(DailyPrice.trade_date >= start_date)
        .where(DailyPrice.trade_date <= end_date)
        .order_by(DailyPrice.trade_date)
    )

    results = session.exec(statement).all()

    if not results:
        return pl.DataFrame(
            schema={
                "trade_date": pl.Date,
                "adjusted_close": pl.Float64,
            }
        )

    # Convert to Polars DataFrame
    data = [
        {"trade_date": row.trade_date, "adjusted_close": row.adjusted_close}
        for row in results
    ]

    return pl.DataFrame(data)


def calculate_returns(df: pl.DataFrame) -> pl.DataFrame:
    """
    Calculate log returns from price data.

    Log returns are preferred over simple returns because:
    1. They are additive over time
    2. They are approximately normally distributed
    3. They work correctly with GBM

    Args:
        df: DataFrame with 'adjusted_close' column

    Returns:
        DataFrame with additional 'log_return' column
    """
    return df.with_columns(
        pl.col("adjusted_close")
        .log()
        .diff()
        .alias("log_return")
    )


def compute_annualized_statistics(df: pl.DataFrame) -> tuple[float, float]:
    """
    Compute annualized drift (mu) and volatility (sigma).

    Args:
        df: DataFrame with 'log_return' column

    Returns:
        Tuple of (mu, sigma) annualized

    Formulas:
        mu = mean(daily_returns) * 252
        sigma = std(daily_returns) * sqrt(252)
    """
    # Drop null values (first row will be null from diff)
    returns = df.filter(pl.col("log_return").is_not_null())

    # Compute daily statistics
    daily_mean = returns.select(pl.col("log_return").mean()).item()
    daily_std = returns.select(pl.col("log_return").std()).item()

    # Annualize
    mu = daily_mean * TRADING_DAYS_PER_YEAR
    sigma = daily_std * math.sqrt(TRADING_DAYS_PER_YEAR)

    return mu, sigma


def validate_and_prepare_params(
    session: Session,
    request: SimulationRequest,
) -> SimulationParams:
    """
    Validate input data and compute simulation parameters.

    This implements "Gap Handling (Option B)" - we validate the data
    in Python before sending to C++ to avoid crashes.

    Args:
        session: Database session
        request: Simulation request

    Returns:
        Validated SimulationParams ready for the engine

    Raises:
        ValueError: If data is missing, sparse, or invalid
    """
    # Fetch price data
    df = fetch_price_data(
        session,
        request.ticker,
        request.start_date,
        request.end_date,
    )

    # Validate data availability
    if df.is_empty():
        raise ValueError(
            f"No price data found for {request.ticker} "
            f"between {request.start_date} and {request.end_date}"
        )

    num_points = len(df)
    if num_points < MIN_DATA_POINTS:
        raise ValueError(
            f"Insufficient data for {request.ticker}: "
            f"found {num_points} points, need at least {MIN_DATA_POINTS}. "
            f"Consider extending the date range."
        )

    # Calculate returns
    df = calculate_returns(df)

    # Compute statistics
    mu, sigma = compute_annualized_statistics(df)

    # Validate statistics
    if math.isnan(mu) or math.isnan(sigma):
        raise ValueError(
            f"Could not compute valid statistics for {request.ticker}. "
            f"Data may contain invalid values."
        )

    if sigma <= 0:
        raise ValueError(
            f"Invalid volatility for {request.ticker}: sigma={sigma:.4f}. "
            f"Volatility must be positive."
        )

    # Get the most recent price as starting point
    s0 = df.select(pl.col("adjusted_close").last()).item()

    if s0 <= 0 or math.isnan(s0):
        raise ValueError(
            f"Invalid starting price for {request.ticker}: s0={s0}. "
            f"Price must be positive."
        )

    return SimulationParams(
        ticker=request.ticker,
        s0=s0,
        mu=mu,
        sigma=sigma,
        num_data_points=num_points,
        start_date=request.start_date,
        end_date=request.end_date,
    )


def run_simulation(
    session: Session,
    request: SimulationRequest,
) -> "SimulationResult":
    """
    Run Monte Carlo simulation for a given ticker.

    This is the main entry point for the simulation service.

    Args:
        session: Database session for fetching price data
        request: Simulation request parameters

    Returns:
        SimulationResult from the C++ engine

    Raises:
        ValueError: If data validation fails
        ImportError: If C++ engine is not built
    """
    # Import here to fail fast with clear error if not built
    from app.engine import run_monte_carlo

    if run_monte_carlo is None:
        raise ImportError(
            "Monte Carlo engine not available. "
            "Run 'python backend/scripts/build_extension.py' to build."
        )

    # Validate and prepare parameters
    params = validate_and_prepare_params(session, request)

    # Run simulation using C++ engine
    result = run_monte_carlo(
        s0=params.s0,
        mu=params.mu,
        sigma=params.sigma,
        num_simulations=request.num_simulations,
        num_steps=request.num_steps,
        dt=DAILY_DT,  # Critical: use double precision!
        histogram_bins=request.histogram_bins,
        seed=request.seed,
    )

    return result


def get_simulation_summary(
    session: Session,
    request: SimulationRequest,
) -> dict:
    """
    Run simulation and return a summary dictionary.

    Convenience function that returns a JSON-serializable summary.

    Args:
        session: Database session
        request: Simulation request

    Returns:
        Dictionary with simulation results
    """
    params = validate_and_prepare_params(session, request)
    result = run_simulation(session, request)

    s0 = params.s0
    
    # Calculate Tail Risk Metrics
    # VaR: Difference between Initial Price and Percentile Price (Positive = Loss)
    # We use max(0, ...) to ensure meaningful loss (though price can gain, VaR usually focuses on downside)
    # Actually, VaR is just the loss amount at that confidence level. 
    # If percentile is > s0 (gain), VaR is negative (no loss).
    var_95 = s0 - result.final_percentile_05
    var_99 = s0 - result.final_percentile_01

    # CVaR (Expected Shortfall): Average of prices *below* the VaR threshold
    # Note: final_prices is sorted in C++? Yes.
    # But C++ result.final_prices might be just a list copy.
    # We can filter locally.
    
    cutoff_95 = result.final_percentile_05
    cutoff_99 = result.final_percentile_01
    
    # optimization: final_prices is sorted!
    # But filtering is O(N) anyway, fine for 10k items.
    
    tail_losses_95 = [p for p in result.final_prices if p <= cutoff_95]
    avg_tail_price_95 = sum(tail_losses_95) / len(tail_losses_95) if tail_losses_95 else cutoff_95
    cvar_95 = s0 - avg_tail_price_95

    tail_losses_99 = [p for p in result.final_prices if p <= cutoff_99]
    avg_tail_price_99 = sum(tail_losses_99) / len(tail_losses_99) if tail_losses_99 else cutoff_99
    cvar_99 = s0 - avg_tail_price_99

    return {
        "ticker": params.ticker,
        "parameters": {
            "s0": params.s0,
            "mu": params.mu,
            "sigma": params.sigma,
            "num_simulations": request.num_simulations,
            "num_steps": request.num_steps,
            "data_points_used": params.num_data_points,
            "analysis_period": {
                "start": params.start_date.isoformat(),
                "end": params.end_date.isoformat(),
            },
        },
        "results": {
            "mean_path": result.mean_path,
            "percentile_05": result.percentile_05,
            "percentile_95": result.percentile_95,
            "histogram": {
                "counts": result.histogram_data,
                "edges": result.histogram_edges,
            },
            "final_price": {
                "mean": result.final_price_mean,
                "std": result.final_price_std,
                "min": result.final_price_min,
                "max": result.final_price_max,
            },
            "tail_risk": {
                "var_95": var_95,
                "var_99": var_99,
                "cvar_95": cvar_95,
                "cvar_99": cvar_99,
            }
        },
    }
