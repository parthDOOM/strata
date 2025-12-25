"""
Market data API endpoints.

Provides access to ticker information and historical price data.
"""

from datetime import date, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.market_data import DailyPrice, Ticker
from app.schemas.market import (
    PriceHistoryResponse,
    PricePoint,
    SyncResponse,
    TickerCreate,
    TickerListResponse,
    TickerResponse,
)
from app.services.ingestion import MarketDataService

router = APIRouter(prefix="/market", tags=["Market Data"])


# Type alias for session dependency
SessionDep = Annotated[Session, Depends(get_session)]


@router.get(
    "/tickers",
    response_model=TickerListResponse,
    summary="List all tickers",
    description="Returns all available tickers in the database with their metadata.",
)
async def list_tickers(
    session: SessionDep,
    active_only: bool = Query(True, description="Only return active tickers"),
) -> TickerListResponse:
    """
    List all available tickers.

    Args:
        session: Database session (injected)
        active_only: If True, only return actively tracked tickers

    Returns:
        List of tickers with count
    """
    statement = select(Ticker)
    if active_only:
        statement = statement.where(Ticker.is_active == True)  # noqa: E712

    statement = statement.order_by(Ticker.symbol)
    results = session.exec(statement).all()

    tickers = [
        TickerResponse(
            symbol=t.symbol,
            name=t.name,
            sector=t.sector,
            is_active=t.is_active,
        )
        for t in results
    ]

    return TickerListResponse(tickers=tickers, count=len(tickers))


@router.get(
    "/tickers/{symbol}",
    response_model=TickerResponse,
    summary="Get ticker details",
    description="Returns detailed information for a specific ticker.",
    responses={404: {"description": "Ticker not found"}},
)
async def get_ticker(
    symbol: str,
    session: SessionDep,
) -> TickerResponse:
    """
    Get details for a specific ticker.

    Args:
        symbol: Ticker symbol (case-insensitive)
        session: Database session (injected)

    Returns:
        Ticker details

    Raises:
        HTTPException: 404 if ticker not found
    """
    ticker = session.get(Ticker, symbol.upper())

    if not ticker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker '{symbol.upper()}' not found",
        )

    return TickerResponse(
        symbol=ticker.symbol,
        name=ticker.name,
        sector=ticker.sector,
        is_active=ticker.is_active,
    )


@router.get(
    "/prices/{symbol}",
    response_model=PriceHistoryResponse,
    summary="Get price history",
    description="Returns historical OHLCV price data for a ticker.",
    responses={404: {"description": "Ticker not found or no data available"}},
)
async def get_price_history(
    symbol: str,
    session: SessionDep,
    start_date: Optional[date] = Query(
        None,
        description="Start date (inclusive). Defaults to 1 year ago.",
    ),
    end_date: Optional[date] = Query(
        None,
        description="End date (inclusive). Defaults to today.",
    ),
    limit: int = Query(
        252,
        ge=1,
        le=10000,
        description="Maximum number of records to return",
    ),
) -> PriceHistoryResponse:
    """
    Get historical price data for a ticker.

    Args:
        symbol: Ticker symbol (case-insensitive)
        session: Database session (injected)
        start_date: Start of date range (default: 1 year ago)
        end_date: End of date range (default: today)
        limit: Maximum records to return

    Returns:
        Price history with OHLCV data

    Raises:
        HTTPException: 404 if ticker not found or no data
    """
    symbol = symbol.upper()

    # Verify ticker exists
    ticker = session.get(Ticker, symbol)
    if not ticker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker '{symbol}' not found",
        )

    # Default date range
    if end_date is None:
        end_date = date.today()

    # Query prices
    statement = (
        select(DailyPrice)
        .where(DailyPrice.symbol == symbol)
        .where(DailyPrice.trade_date <= end_date)
    )

    if start_date:
        statement = statement.where(DailyPrice.trade_date >= start_date)

    statement = statement.order_by(DailyPrice.trade_date.desc()).limit(limit)

    results = session.exec(statement).all()

    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No price data found for '{symbol}' in the specified date range",
        )

    # Convert to response model (reverse to chronological order)
    prices = [
        PricePoint(
            trade_date=p.trade_date,
            open=p.open,
            high=p.high,
            low=p.low,
            close=p.close,
            volume=p.volume,
            adjusted_close=p.adjusted_close,
        )
        for p in reversed(results)
    ]

    return PriceHistoryResponse(
        ticker=symbol,
        prices=prices,
        count=len(prices),
        start_date=prices[0].trade_date if prices else None,
        end_date=prices[-1].trade_date if prices else None,
    )


@router.post(
    "/tickers",
    response_model=TickerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new ticker",
    description="Add a new ticker to the database.",
)
async def create_ticker(
    ticker_in: TickerCreate,
    session: SessionDep,
) -> TickerResponse:
    """
    Create a new ticker.

    Args:
        ticker_in: Ticker creation data
        session: Database session

    Returns:
        Created ticker details
    """
    # Check if exists
    existing_ticker = session.get(Ticker, ticker_in.symbol.upper())
    if existing_ticker:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ticker '{ticker_in.symbol.upper()}' already exists",
        )

    # Create new ticker
    ticker = Ticker(
        symbol=ticker_in.symbol.upper(),
        name=ticker_in.name,
        sector=ticker_in.sector,
        is_active=True,
    )
    session.add(ticker)
    session.commit()
    session.refresh(ticker)

    return TickerResponse(
        symbol=ticker.symbol,
        name=ticker.name,
        sector=ticker.sector,
        is_active=ticker.is_active,
    )


@router.post(
    "/sync/{symbol}",
    response_model=SyncResponse,
    summary="Sync ticker data",
    description="Trigger a manual sync of market data for a specific ticker.",
)
async def sync_ticker(
    symbol: str,
    session: SessionDep,
) -> SyncResponse:
    """
    Sync market data for a ticker.

    Args:
        symbol: Ticker symbol
        session: Database session

    Returns:
        Sync status and rows added
    """
    service = MarketDataService()
    try:
        rows = service.sync_ticker(symbol.upper(), session)
        return SyncResponse(status="updated", rows_added=rows)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync data: {str(e)}",
        )


@router.get(
    "/search",
    summary="Search for companies",
    description="Search for companies by name using Yahoo Finance API.",
)
def search_companies(
    q: str = Query(..., min_length=1, description="Search query"),
) -> list[dict]:
    """
    Proxy search requests to Yahoo Finance.
    """
    import requests

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        url = "https://query2.finance.yahoo.com/v1/finance/search"
        params = {
            "q": q,
            "quotesCount": 10,
            "newsCount": 0,
            "enableFuzzyQuery": "false",
            "quotesQueryId": "tss_match_phrase_query"
        }

        # Run synchronous request in threadpool since this is an async path
        # Note: In production, consider using httpx async client
        response = requests.get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()

        results = []
        if "quotes" in data:
            for quote in data["quotes"]:
                if quote.get("quoteType") in ["EQUITY", "ETF", "INDEX"]:
                    results.append({
                        "symbol": quote.get("symbol"),
                        "name": quote.get("shortname") or quote.get("longname"),
                        "exchange": quote.get("exchange"),
                        "sector": quote.get("sector", ""),
                        "type": quote.get("quoteType")
                    })

        return results

    except Exception as e:
        print(f"Search error: {e}")
        return []
