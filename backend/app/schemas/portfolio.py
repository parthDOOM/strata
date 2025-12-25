from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

# Optimization Schemas
class OptimizationRequest(BaseModel):
    tickers: List[str]

class AllocationItem(BaseModel):
    ticker: str
    weight: float

class OptimizationResponse(BaseModel):
    allocations: List[AllocationItem]
    risk_metric: str = "HRP"

# Portfolio Schemas
class PortfolioItemCreate(BaseModel):
    symbol: str
    quantity: float
    average_price: float

class PortfolioItemRead(PortfolioItemCreate):
    id: int
    portfolio_id: int

class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    user_name: str = "Guest"

class PortfolioRead(PortfolioCreate):
    id: int
    created_at: datetime
    items: List[PortfolioItemRead] = []

class PortfolioPerformance(BaseModel):
    portfolio_id: int
    total_value: float
    daily_return_pct: float
    equity_curve: List[dict]  # Date/Value points
    holdings: List[dict]      # Enhanced holdings with current price

