"""
Simulation Pydantic schemas.

Defines request/response models for Monte Carlo simulation endpoints.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class SimulationRequest(BaseModel):
    """Request parameters for Monte Carlo simulation."""

    ticker: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="Ticker symbol to simulate",
    )
    start_date: date = Field(..., description="Start date for historical data analysis")
    end_date: date = Field(..., description="End date for historical data analysis")
    num_simulations: int = Field(
        10_000,
        ge=100,
        le=100_000,
        description="Number of Monte Carlo paths to simulate",
    )
    num_steps: int = Field(
        252,
        ge=1,
        le=2520,
        description="Number of time steps (trading days) to project",
    )
    histogram_bins: int = Field(
        50,
        ge=10,
        le=200,
        description="Number of bins for final price histogram",
    )
    seed: Optional[int] = Field(
        None,
        ge=0,
        description="Random seed for reproducibility (None = random)",
    )

    @field_validator("end_date")
    @classmethod
    def end_date_after_start(cls, v: date, info) -> date:
        """Validate that end_date is after start_date."""
        start = info.data.get("start_date")
        if start and v <= start:
            raise ValueError("end_date must be after start_date")
        return v


class SimulationParameters(BaseModel):
    """Computed simulation parameters from historical data."""

    s0: float = Field(..., description="Starting price (most recent adjusted close)")
    mu: float = Field(..., description="Annualized drift (expected return)")
    sigma: float = Field(..., description="Annualized volatility")
    num_simulations: int = Field(..., description="Number of simulation paths")
    num_steps: int = Field(..., description="Number of time steps")
    data_points_used: int = Field(..., description="Number of historical data points used")
    analysis_period: dict = Field(..., description="Start and end dates of analysis")


class FinalPriceStats(BaseModel):
    """Statistics for final simulated prices."""

    mean: float = Field(..., description="Mean final price")
    std: float = Field(..., description="Standard deviation of final prices")
    min: float = Field(..., description="Minimum final price")
    max: float = Field(..., description="Maximum final price")


class HistogramData(BaseModel):
    """Histogram of final price distribution."""

    counts: list[int] = Field(..., description="Count in each bin")
    edges: list[float] = Field(..., description="Bin edge values")


class TailRiskMetrics(BaseModel):
    """Value at Risk and Conditional Value at Risk metrics."""
    
    var_95: float = Field(..., description="Value at Risk (95% confidence)")
    var_99: float = Field(..., description="Value at Risk (99% confidence)")
    cvar_95: float = Field(..., description="Conditional VaR (95%) - Expected Shortfall")
    cvar_99: float = Field(..., description="Conditional VaR (99%) - Expected Shortfall")


class SimulationResults(BaseModel):
    """Core simulation output data."""

    mean_path: list[float] = Field(..., description="Average price path across simulations")
    percentile_05: list[float] = Field(..., description="5th percentile path (95% CI lower)")
    percentile_95: list[float] = Field(..., description="95th percentile path (95% CI upper)")
    histogram: HistogramData = Field(..., description="Final price distribution")
    final_price: FinalPriceStats = Field(..., description="Final price statistics")
    tail_risk: TailRiskMetrics = Field(..., description="Risk analysis metrics")


class SimulationResponse(BaseModel):
    """Complete response for Monte Carlo simulation."""

    ticker: str = Field(..., description="Ticker symbol simulated")
    parameters: SimulationParameters = Field(..., description="Input parameters used")
    results: SimulationResults = Field(..., description="Simulation results")

    model_config = {
        "json_schema_extra": {
            "example": {
                "ticker": "AAPL",
                "parameters": {
                    "s0": 195.50,
                    "mu": 0.15,
                    "sigma": 0.25,
                    "num_simulations": 10000,
                    "num_steps": 252,
                    "data_points_used": 252,
                    "analysis_period": {
                        "start": "2023-01-01",
                        "end": "2024-01-01",
                    },
                },
                "results": {
                    "mean_path": [195.50, 196.20, "..."],
                    "percentile_05": [195.50, 194.10, "..."],
                    "percentile_95": [195.50, 198.30, "..."],
                    "histogram": {
                        "counts": [10, 45, 120, "..."],
                        "edges": [150.0, 160.0, 170.0, "..."],
                    },
                    "final_price": {
                        "mean": 225.75,
                        "std": 45.20,
                        "min": 120.50,
                        "max": 380.25,
                    },
                },
            }
        }
    }


class SimulationError(BaseModel):
    """Error response for simulation failures."""

    detail: str = Field(..., description="Error message")
    ticker: Optional[str] = Field(None, description="Ticker that caused the error")
    error_type: str = Field(..., description="Type of error (validation, data, engine)")
