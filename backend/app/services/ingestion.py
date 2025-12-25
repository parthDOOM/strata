"""
Market data ingestion service.

Handles synchronization of historical price data from external
providers to the local SQLite database with delta-sync logic.
"""

from datetime import date, timedelta

import polars as pl
from sqlmodel import Session, select

from app.models.market_data import DailyPrice, Ticker
from app.services.data_providers import DataProvider, DataProviderError, YFinanceProvider


class MarketDataService:
    """
    Service for syncing market data to the database.

    Implements delta-sync logic to only fetch new data since
    the last available date for each ticker.
    """

    def __init__(self, provider: DataProvider | None = None):
        """
        Initialize the service with a data provider.

        Args:
            provider: DataProvider instance. Defaults to YFinanceProvider.
        """
        self.provider = provider or YFinanceProvider()

    def sync_ticker(
        self,
        symbol: str,
        session: Session,
        start_date: date = date(2000, 1, 1),
    ) -> int:
        """
        Synchronize historical data for a ticker.

        Implements smart delta-sync:
        1. If no data exists, fetches from start_date
        2. If data exists, fetches from last_date + 1 day
        3. Bulk inserts new records

        Args:
            symbol: Ticker symbol to sync
            session: SQLModel session
            start_date: Default start date for initial sync

        Returns:
            Number of rows inserted

        Raises:
            DataProviderError: If fetching fails
        """
        # Ensure ticker exists in the database
        self._ensure_ticker_exists(symbol, session)

        # Get the latest date we have for this symbol
        last_date = self._get_latest_date(symbol, session)

        # Determine fetch range
        if last_date is None:
            fetch_from = start_date
        else:
            fetch_from = last_date + timedelta(days=1)

        fetch_to = date.today()

        # Skip if we're already up to date
        if fetch_from > fetch_to:
            return 0

        # Fetch new data from provider
        try:
            df = self.provider.get_historical_prices(symbol, fetch_from, fetch_to)
        except DataProviderError:
            raise

        if df.is_empty():
            return 0

        # Bulk insert new rows
        rows_inserted = self._bulk_insert(symbol, df, session)

        return rows_inserted

    def _ensure_ticker_exists(self, symbol: str, session: Session) -> Ticker:
        """Ensure ticker record exists, create if not."""
        statement = select(Ticker).where(Ticker.symbol == symbol)
        ticker = session.exec(statement).first()

        if ticker is None:
            ticker = Ticker(symbol=symbol, is_active=True)
            session.add(ticker)
            session.commit()
            session.refresh(ticker)

        return ticker

    def _get_latest_date(self, symbol: str, session: Session) -> date | None:
        """Get the most recent date we have data for."""
        statement = (
            select(DailyPrice.trade_date)
            .where(DailyPrice.symbol == symbol)
            .order_by(DailyPrice.trade_date.desc())
            .limit(1)
        )
        result = session.exec(statement).first()
        return result

    def _bulk_insert(
        self,
        symbol: str,
        df: pl.DataFrame,
        session: Session,
    ) -> int:
        """
        Bulk insert price data from a Polars DataFrame.

        Uses executemany for optimal SQLite performance.
        """
        if df.is_empty():
            return 0

        # Convert Polars DataFrame to list of dicts
        records = df.to_dicts()

        # Create DailyPrice objects
        price_objects = []
        for record in records:
            price = DailyPrice(
                symbol=symbol,
                trade_date=record["date"],
                open=float(record["open"]),
                high=float(record["high"]),
                low=float(record["low"]),
                close=float(record["close"]),
                volume=float(record["volume"]),
                adjusted_close=float(record["adjusted_close"]),
            )
            price_objects.append(price)

        # Bulk add to session
        session.add_all(price_objects)
        session.commit()

        return len(price_objects)

    def sync_multiple(
        self,
        symbols: list[str],
        session: Session,
        start_date: date = date(2000, 1, 1),
    ) -> dict[str, int]:
        """
        Sync multiple tickers and return a summary.

        Args:
            symbols: List of ticker symbols
            session: SQLModel session
            start_date: Default start date for initial sync

        Returns:
            Dict mapping symbol to rows inserted
        """
        results = {}
        for symbol in symbols:
            try:
                rows = self.sync_ticker(symbol, session, start_date)
                results[symbol] = rows
                print(f"Synced {symbol}: {rows} rows added")
            except DataProviderError as e:
                results[symbol] = -1
                print(f"Failed {symbol}: {e}")
            except Exception as e:
                results[symbol] = -1
                print(f"Error {symbol}: {e}")

        return results
