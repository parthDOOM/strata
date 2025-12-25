from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import date

class BacktestRequest(BaseModel):
    ticker_1: str
    ticker_2: str
    entry_z: float = 2.0
    exit_z: float = 0.0
    stop_loss_z: float = 4.0
    lookback_window: int = 30  # Days for rolling stats

class BacktestResponse(BaseModel):
    dates: List[str]
    equity_curve: List[float]
    benchmark_curve: List[float] # Buy & Hold Ticker 1
    drawdown: List[float]
    metrics: Dict[str, float] # Sharpe, Total Return, Max DD, Win Rate
