"""
Data provider architecture for market data ingestion.

Implements an abstract base class pattern for pluggable data sources.
All providers return Polars DataFrames with normalized column names.
"""

from abc import ABC, abstractmethod
from datetime import date

import polars as pl
import yfinance as yf


class DataProvider(ABC):
    """
    Abstract base class for market data providers.

    All concrete providers must implement get_historical_prices()
    and return data as a Polars DataFrame with standardized columns.
    """

    @abstractmethod
    def get_historical_prices(
        self,
        symbol: str,
        start_date: date,
        end_date: date,
    ) -> pl.DataFrame:
        """
        Fetch historical OHLCV data for a symbol.

        Args:
            symbol: Ticker symbol (e.g., "AAPL", "BTC-USD")
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            Polars DataFrame with columns:
            [date, open, high, low, close, volume, adjusted_close]

        Raises:
            DataProviderError: If fetching fails
        """
        ...


class DataProviderError(Exception):
    """Exception raised when data provider operations fail."""

    pass


class YFinanceProvider(DataProvider):
    """
    Yahoo Finance data provider.

    Uses yfinance library to fetch historical OHLCV data.
    Converts pandas output to Polars with normalized column names.
    """

    # Column name mapping from yfinance to our schema
    _COLUMN_MAP = {
        "Date": "date",
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Volume": "volume",
        "Adj Close": "adjusted_close",
    }

    def get_historical_prices(
        self,
        symbol: str,
        start_date: date,
        end_date: date,
    ) -> pl.DataFrame:
        """
        Fetch historical prices from Yahoo Finance.

        Args:
            symbol: Ticker symbol
            start_date: Start date (inclusive)
            end_date: End date (inclusive)

        Returns:
            Polars DataFrame with normalized columns.
            Returns empty DataFrame if no data available.
        """
        try:
            ticker = yf.Ticker(symbol)

            # yfinance uses string dates
            df_pandas = ticker.history(
                start=start_date.isoformat(),
                end=end_date.isoformat(),
                auto_adjust=False,  # Keep unadjusted prices + Adj Close
            )

            # Handle empty results
            if df_pandas.empty:
                return self._empty_dataframe()

            # Reset index to get Date as a column
            df_pandas = df_pandas.reset_index()

            # Convert to Polars
            df = pl.from_pandas(df_pandas)

            # Normalize column names
            df = self._normalize_columns(df)

            # Ensure date is proper date type (not datetime)
            if "date" in df.columns:
                df = df.with_columns(pl.col("date").cast(pl.Date))

            # Cast all numeric columns to Float64 (volume can be Int64 from yfinance)
            numeric_cols = ["open", "high", "low", "close", "volume", "adjusted_close"]
            for col in numeric_cols:
                if col in df.columns:
                    df = df.with_columns(pl.col(col).cast(pl.Float64))

            # Select only the columns we need, in order
            required_cols = ["date", "open", "high", "low", "close", "volume", "adjusted_close"]
            available_cols = [c for c in required_cols if c in df.columns]

            return df.select(available_cols)

        except Exception as e:
            raise DataProviderError(f"Failed to fetch {symbol}: {e}") from e

    def _normalize_columns(self, df: pl.DataFrame) -> pl.DataFrame:
        """Rename columns to lowercase standardized names."""
        rename_map = {}
        for col in df.columns:
            # Handle both exact matches and case variations
            normalized = self._COLUMN_MAP.get(col, col.lower().replace(" ", "_"))
            rename_map[col] = normalized
        return df.rename(rename_map)

    def _empty_dataframe(self) -> pl.DataFrame:
        """Return an empty DataFrame with the correct schema."""
        return pl.DataFrame(
            schema={
                "date": pl.Date,
                "open": pl.Float64,
                "high": pl.Float64,
                "low": pl.Float64,
                "close": pl.Float64,
                "volume": pl.Float64,
                "adjusted_close": pl.Float64,
            }
        )
