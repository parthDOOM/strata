"""
Market data Pydantic schemas.

Defines request/response models for market data endpoints.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class TickerBase(BaseModel):
    """Base ticker information."""

    symbol: str = Field(..., description="Ticker symbol (e.g., AAPL, BTC-USD)")
    name: Optional[str] = Field(None, description="Full company/asset name")
    sector: Optional[str] = Field(None, description="Sector classification")


class TickerCreate(TickerBase):
    """Schema for creating a new ticker."""
    pass


class TickerResponse(TickerBase):
    """Ticker response with activity status."""

    is_active: bool = Field(True, description="Whether the ticker is actively tracked")

    model_config = {"from_attributes": True}


class TickerListResponse(BaseModel):
    """Response containing list of tickers."""

    tickers: list[TickerResponse]
    count: int = Field(..., description="Total number of tickers")


class SyncResponse(BaseModel):
    """Response for sync operation."""
    status: str
    rows_added: int


class SearchResult(BaseModel):
    """Response for company search."""
    symbol: str
    name: str
    exchange: str
    sector: str = ""
    type_disp: str = ""


class PricePoint(BaseModel):
    """Single price data point."""

    trade_date: date = Field(..., alias="date", description="Trading date")
    open: float = Field(..., description="Opening price")
    high: float = Field(..., description="Highest price of the day")
    low: float = Field(..., description="Lowest price of the day")
    close: float = Field(..., description="Closing price")
    volume: float = Field(..., description="Trading volume")
    adjusted_close: float = Field(..., description="Adjusted closing price")

    model_config = {"from_attributes": True, "populate_by_name": True}


class PriceHistoryRequest(BaseModel):
    """Request parameters for price history."""

    start_date: Optional[date] = Field(None, description="Start date (inclusive)")
    end_date: Optional[date] = Field(None, description="End date (inclusive)")
    limit: int = Field(252, ge=1, le=10000, description="Maximum number of records")


class PriceHistoryResponse(BaseModel):
    """Response containing price history data."""

    ticker: str = Field(..., description="Ticker symbol")
    prices: list[PricePoint] = Field(default_factory=list)
    count: int = Field(..., description="Number of price points returned")
    start_date: Optional[date] = Field(None, description="Earliest date in response")
    end_date: Optional[date] = Field(None, description="Latest date in response")
