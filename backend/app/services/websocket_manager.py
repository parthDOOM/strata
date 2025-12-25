import asyncio
import json
import random
from datetime import datetime
from typing import List, AsyncGenerator
from fastapi import WebSocket

class ConnectionManager:
    """
    Manages WebSocket connections.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # Handle potential stale connections
                pass

from sqlmodel import Session, select
from app.core.db import engine
from app.models.market_data import DailyPrice

async def price_generator(ticker: str) -> AsyncGenerator[dict, None]:
    """
    Generates a realistic random walk for a ticker.
    Starts from the last available price in the DB.
    """
    price = 100.00
    
    # Try to get real price from DB
    try:
        with Session(engine) as session:
            statement = select(DailyPrice.adjusted_close).where(DailyPrice.symbol == ticker.upper()).order_by(DailyPrice.trade_date.desc()).limit(1)
            last_price = session.exec(statement).first()
            if last_price:
                price = float(last_price)
    except Exception as e:
        print(f"Error fetching start price: {e}")

    # Fallbacks for common tickers if DB empty
    if price == 100.00:
        if ticker.upper() == "BTC-USD": price = 65000.00
        elif ticker.upper() == "ETH-USD": price = 3500.00
        elif ticker.upper() == "SPY": price = 450.00
        elif ticker.upper() == "AAPL": price = 220.00
        elif ticker.upper() == "MSFT": price = 420.00
        elif ticker.upper() == "GOOGL": price = 175.00
        elif ticker.upper() == "NVDA": price = 120.00
        elif ticker.upper() == "TSLA": price = 250.00
        elif ticker.upper() == "AMD": price = 160.00
    
    # Add some initial noise
    price += random.uniform(-price*0.001, price*0.001)

    while True:
        await asyncio.sleep(1) # 1 Tick per second
        
        # Random Walk: Drift + Volatility
        volatility = price * 0.0005 # 0.05% volatility per second
        shock = random.gauss(0, volatility)
        price += shock
        
        yield {
            "ticker": ticker.upper(),
            "price": round(price, 2),
            "timestamp": datetime.now().isoformat()
        }
