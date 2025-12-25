"""
Market data SQLModel schemas.

Defines the core tables for storing ticker metadata,
daily OHLCV prices, and economic time series data.
"""

from __future__ import annotations

import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint


class Ticker(SQLModel, table=True):
    """
    Ticker metadata table.

    Stores information about tradeable securities including
    stocks, ETFs, and cryptocurrencies.
    """

    __tablename__ = "tickers"

    symbol: str = Field(primary_key=True, max_length=20, description="Ticker symbol (e.g., AAPL, BTC-USD)")
    name: Optional[str] = Field(default=None, max_length=255, description="Full company/asset name")
    sector: Optional[str] = Field(default=None, max_length=100, description="Sector classification")
    is_active: bool = Field(default=True, description="Whether the ticker is actively tracked")


class DailyPrice(SQLModel, table=True):
    """
    Daily OHLCV price data table.

    Stores daily open, high, low, close, volume, and adjusted close
    for each ticker. Has a composite unique constraint on (symbol, date)
    to prevent duplicate entries.
    """

    __tablename__ = "daily_prices"
    __table_args__ = (
        UniqueConstraint("symbol", "trade_date", name="uq_symbol_date"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(
        foreign_key="tickers.symbol",
        index=True,
        max_length=20,
        description="Ticker symbol reference",
    )
    trade_date: datetime.date = Field(index=True, description="Trading date")

    # OHLCV data
    open: float = Field(description="Opening price")
    high: float = Field(description="Highest price of the day")
    low: float = Field(description="Lowest price of the day")
    close: float = Field(description="Closing price")
    volume: float = Field(description="Trading volume")
    adjusted_close: float = Field(description="Adjusted closing price (accounts for splits/dividends)")


class EconomicSeries(SQLModel, table=True):
    """
    Economic time series data table.

    Stores FRED and other economic indicator data.
    Composite primary key on (series_id, date).
    """

    __tablename__ = "economic_series"
    __table_args__ = (
        UniqueConstraint("series_id", "obs_date", name="uq_series_date"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    series_id: str = Field(
        index=True,
        max_length=50,
        description="FRED series identifier (e.g., DGS10, FEDFUNDS)",
    )
    obs_date: datetime.date = Field(index=True, description="Observation date")
    value: float = Field(description="Series value")
