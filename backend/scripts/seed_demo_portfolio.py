#!/usr/bin/env python3
"""
Seed script for creating a demo portfolio.

Usage:
    cd backend
    python -m scripts.seed_demo_portfolio
"""

import sys
from pathlib import Path

# Add backend to path for imports
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlmodel import Session, select
from app.core.db import engine
from app.models.portfolio import Portfolio, PortfolioItem

def seed_demo_portfolio():
    print("Creating Demo Portfolio...")

    with Session(engine) as session:
        # Check if already exists
        statement = select(Portfolio).where(Portfolio.name == "Demo Growth Fund")
        existing = session.exec(statement).first()
        
        if existing:
            print("Demo Portfolio already exists. Skipping.")
            return

        # Create Portfolio
        portfolio = Portfolio(
            name="Demo Growth Fund",
            user_name="Demo User"
        )
        session.add(portfolio)
        session.commit()
        session.refresh(portfolio)

        print(f"Created Portfolio: {portfolio.name} (ID: {portfolio.id})")

        # Create Holdings (designed for green/mixed PnL)
        holdings = [
            # Symbol, Quantity, Avg Price
            ("NVDA", 150, 45.50),   # Massive Gain (Current ~120+)
            ("AAPL", 50, 150.00),   # Solid Gain (Current ~220+)
            ("MSFT", 40, 310.00),   # Moderate Gain (Current ~420+)
            ("TSLA", 100, 290.00),  # Loss (Current ~250)
            ("AMD", 200, 85.00),    # Gain (Current ~160)
            ("AMZN", 60, 130.00),   # Gain (Current ~180)
            ("GOOGL", 40, 120.00),  # Gain (Current ~175)
            ("META", 30, 200.00),   # Big Gain (Current ~500)
            ("JPM", 50, 150.00),    # Small Gain (Current ~200)
            ("BAC", 100, 30.00),    # Small Gain (Current ~40)
        ]

        for symbol, qty, avg_price in holdings:
            item = PortfolioItem(
                portfolio_id=portfolio.id,
                symbol=symbol,
                quantity=qty,
                average_price=avg_price
            )
            session.add(item)
            print(f"  Added {symbol}: {qty} shares @ ${avg_price}")

        session.commit()
        print("Demo Portfolio populated successfully!")

if __name__ == "__main__":
    seed_demo_portfolio()
