"""
Pydantic schemas for the Quant Platform API.

Provides request/response models with validation for all endpoints.
"""

from .market import (
    PriceHistoryRequest,
    PriceHistoryResponse,
    PricePoint,
    TickerListResponse,
    TickerResponse,
)
from .simulation import (
    SimulationError,
    SimulationRequest,
    SimulationResponse,
)

__all__ = [
    # Market schemas
    "TickerResponse",
    "TickerListResponse",
    "PricePoint",
    "PriceHistoryRequest",
    "PriceHistoryResponse",
    # Simulation schemas
    "SimulationRequest",
    "SimulationResponse",
    "SimulationError",
]
