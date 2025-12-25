"""
Statistical Arbitrage (Pairs Trading) models.
"""

from typing import Optional

from sqlmodel import Field, SQLModel


class CointegratedPair(SQLModel, table=True):
    """
    Represents a cointegrated pair of assets identified by the strategy.
    
    Attributes:
        id: Unique identifier
        ticker_1: Symbol of first asset (dependent variable Y)
        ticker_2: Symbol of second asset (independent variable X)
        p_value: Cointegration test p-value (lower is better, <0.05 usually)
        hedge_ratio: Beta from OLS (Y = beta * X + alpha)
        half_life: Speed of mean reversion in days
        last_z_score: Most recent z-score of the spread
        is_active: Whether the pair is currently monitored
    """
    
    id: Optional[int] = Field(default=None, primary_key=True)
    ticker_1: str = Field(index=True)
    ticker_2: str = Field(index=True)
    p_value: float
    hedge_ratio: float
    half_life: float
    last_z_score: float
    is_active: bool = Field(default=True)
