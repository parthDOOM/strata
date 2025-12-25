from pydantic import BaseModel
from typing import List, Dict

class OptimizationRequest(BaseModel):
    tickers: List[str]

class AllocationItem(BaseModel):
    ticker: str
    weight: float

class OptimizationResponse(BaseModel):
    allocations: List[AllocationItem]
    risk_metric: str = "HRP"
