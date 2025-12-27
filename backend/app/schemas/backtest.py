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
    
    # Grid Search Parameters (Optional)
    entry_z_min: Optional[float] = None
    entry_z_max: Optional[float] = None
    entry_z_step: Optional[float] = None
    
    exit_z_min: Optional[float] = None
    exit_z_max: Optional[float] = None
    exit_z_step: Optional[float] = None

class SensitivityPoint(BaseModel):
    entry_z: float
    exit_z: float
    sharpe_ratio: float
    total_return: float
    win_rate: float
    trades: int

class BacktestResponse(BaseModel):
    dates: List[str]
    equity_curve: List[float]
    benchmark_curve: List[float] # Buy & Hold Ticker 1
    drawdown: List[float]
    metrics: Dict[str, float] # Sharpe, Total Return, Max DD, Win Rate
    sensitivity_matrix: Optional[List[SensitivityPoint]] = None
