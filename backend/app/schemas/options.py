"""
Options Analysis Pydantic schemas.
"""
from typing import List, Optional
from pydantic import BaseModel

class IVSurfaceResponse(BaseModel):
    ticker: str
    x: List[float]  # Strikes
    y: List[float]  # Days to Expiry
    z: List[float]  # Implied Volatility
    delta: Optional[List[float]] = None
    gamma: Optional[List[float]] = None
    vega: Optional[List[float]] = None
    theta: Optional[List[float]] = None
    rho: Optional[List[float]] = None
    count: int
