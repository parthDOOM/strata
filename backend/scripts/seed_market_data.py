#!/usr/bin/env python3
"""
Seed script for initializing the database with market data.

Populates the database with a diverse universe of assets
suitable for testing HRP (Hierarchical Risk Parity) and
Statistical Arbitrage strategies.

Usage:
    cd backend
    python -m scripts.seed_market_data
"""

import sys
from pathlib import Path

# Add backend to path for imports
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session

from app.core.db import create_db_and_tables, engine
from app.models.market_data import Ticker
from app.services.ingestion import MarketDataService


# =========================
# Asset Universe Definition
# =========================
UNIVERSE = {
    # Broad Market Indices/ETFs
    "indices": [
        ("SPY", "SPDR S&P 500 ETF Trust", "Index"),
        ("QQQ", "Invesco QQQ Trust", "Index"),
        ("IWM", "iShares Russell 2000 ETF", "Index"),
    ],
    # Technology Sector
    "tech": [
        ("AAPL", "Apple Inc.", "Technology"),
        ("MSFT", "Microsoft Corporation", "Technology"),
        ("NVDA", "NVIDIA Corporation", "Technology"),
        ("GOOGL", "Alphabet Inc.", "Technology"),
        ("AMZN", "Amazon.com Inc.", "Technology"),
        ("META", "Meta Platforms Inc.", "Technology"),
        ("TSLA", "Tesla Inc.", "Technology"),
        ("AMD", "Advanced Micro Devices", "Technology"),
        ("INTC", "Intel Corporation", "Technology"),
        ("CRM", "Salesforce Inc.", "Technology"),
    ],
    # Financial Sector
    "finance": [
        ("JPM", "JPMorgan Chase & Co.", "Financials"),
        ("BAC", "Bank of America Corp", "Financials"),
        ("WFC", "Wells Fargo & Company", "Financials"),
        ("C", "Citigroup Inc.", "Financials"),
        ("GS", "Goldman Sachs Group Inc.", "Financials"),
        ("MS", "Morgan Stanley", "Financials"),
        ("V", "Visa Inc.", "Financials"),
        ("MA", "Mastercard Incorporated", "Financials"),
        ("AXP", "American Express Company", "Financials"),
    ],
    # Energy Sector
    "energy": [
        ("XOM", "Exxon Mobil Corporation", "Energy"),
        ("CVX", "Chevron Corporation", "Energy"),
        ("COP", "ConocoPhillips", "Energy"),
        ("SLB", "Schlumberger Limited", "Energy"),
        ("EOG", "EOG Resources Inc.", "Energy"),
    ],
    # Healthcare
    "healthcare": [
        ("JNJ", "Johnson & Johnson", "Healthcare"),
        ("PFE", "Pfizer Inc.", "Healthcare"),
        ("MRK", "Merck & Co. Inc.", "Healthcare"),
        ("ABBV", "AbbVie Inc.", "Healthcare"),
        ("LLY", "Eli Lilly and Company", "Healthcare"),
        ("UNH", "UnitedHealth Group Inc.", "Healthcare"),
    ],
    # Consumer Staples/Discretionary
    "consumer": [
        ("PG", "Procter & Gamble Co.", "Consumer Staples"),
        ("KO", "The Coca-Cola Company", "Consumer Staples"),
        ("PEP", "PepsiCo Inc.", "Consumer Staples"),
        ("WMT", "Walmart Inc.", "Consumer Staples"),
        ("COST", "Costco Wholesale Corp", "Consumer Staples"),
        ("DIS", "The Walt Disney Company", "Communication Services"),
        ("MCD", "McDonald's Corporation", "Consumer Discretionary"),
        ("NKE", "NIKE Inc.", "Consumer Discretionary"),
        ("SBUX", "Starbucks Corporation", "Consumer Discretionary"),
    ],
    # Industrial & Utils
    "industrial": [
        ("BA", "The Boeing Company", "Industrials"),
        ("CAT", "Caterpillar Inc.", "Industrials"),
        ("GE", "General Electric Company", "Industrials"),
        ("UNP", "Union Pacific Corporation", "Industrials"),
        ("UPS", "United Parcel Service Inc.", "Industrials"),
        ("NEE", "NextEra Energy Inc.", "Utilities"),
        ("SO", "The Southern Company", "Utilities"),
    ],
    # Cryptocurrency
    "crypto": [
        ("BTC-USD", "Bitcoin USD", "Cryptocurrency"),
        ("ETH-USD", "Ethereum USD", "Cryptocurrency"),
    ],
}


def get_all_tickers() -> list[tuple[str, str, str]]:
    """Flatten the universe into a list of (symbol, name, sector) tuples."""
    all_tickers = []
    for category in UNIVERSE.values():
        all_tickers.extend(category)
    return all_tickers


def seed_tickers(session: Session) -> None:
    """Insert all tickers into the database."""
    tickers = get_all_tickers()

    for symbol, name, sector in tickers:
        # Check if ticker already exists
        existing = session.get(Ticker, symbol)
        if existing is None:
            ticker = Ticker(
                symbol=symbol,
                name=name,
                sector=sector,
                is_active=True,
            )
            session.add(ticker)

    session.commit()
    print(f"Seeded {len(tickers)} tickers into database")


def sync_all_market_data(session: Session) -> None:
    """Sync historical data for all tickers in the universe."""
    service = MarketDataService()
    symbols = [t[0] for t in get_all_tickers()]

    print(f"\nSyncing historical data for {len(symbols)} symbols...")
    print("=" * 50)

    results = service.sync_multiple(symbols, session)

    # Print summary
    print("\n" + "=" * 50)
    print("SYNC SUMMARY")
    print("=" * 50)

    total_rows = 0
    successful = 0
    failed = 0

    for symbol, rows in results.items():
        if rows >= 0:
            total_rows += rows
            successful += 1
        else:
            failed += 1

    print(f"Successful: {successful}/{len(symbols)}")
    print(f"Failed: {failed}/{len(symbols)}")
    print(f"Total rows inserted: {total_rows:,}")


def main() -> None:
    """Main entry point for the seed script."""
    print("Quant Platform - Market Data Seeder")
    print("=" * 50)

    # Initialize database
    print("\nInitializing database...")
    create_db_and_tables()

    # Create session and seed data
    with Session(engine) as session:
        # Seed ticker metadata
        print("\nSeeding ticker metadata...")
        seed_tickers(session)

        # Sync historical price data
        sync_all_market_data(session)

    print("\nSeeding complete!")


if __name__ == "__main__":
    main()
