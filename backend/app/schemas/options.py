"""
Options Analysis Pydantic schemas.
"""
from typing import List
from pydantic import BaseModel

class IVSurfaceResponse(BaseModel):
    ticker: str
    x: List[float]  # Strikes
    y: List[float]  # Days to Expiry
    z: List[float]  # Implied Volatility
    count: int
