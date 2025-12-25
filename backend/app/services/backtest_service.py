import polars as pl
import numpy as np
from datetime import date, timedelta
from typing import Tuple, Dict, Any, List
from app.services.ingestion import MarketDataService
from app.schemas.backtest import BacktestRequest, BacktestResponse
from app.models.market_data import DailyPrice, Ticker
from sqlmodel import Session, select
from app.core.db import engine

class BacktestService:
    def __init__(self):
        self.market_service = MarketDataService()

    def get_data_for_ticker(self, ticker: str, start_date: date) -> pl.DataFrame:
        """Fetch daily prices from DB and convert to Polars DataFrame"""
        with Session(engine) as session:
             # Manual query using sqlmodel select to get raw data
             statement = (
                select(DailyPrice.trade_date, DailyPrice.close)
                .where(DailyPrice.symbol == ticker)
                .where(DailyPrice.trade_date >= start_date)
                .order_by(DailyPrice.trade_date)
             )
             results = session.exec(statement).all()
        
        # Convert to Polars
        if not results:
             return pl.DataFrame({"date": [], "close": []})
        
        data = [
             {"date": r[0], "close": float(r[1])} for r in results 
        ]
        
        df = pl.DataFrame(data)
        # Ensure date is sorted
        df = df.sort("date")
        return df

    def calculate_hedge_ratio(self, series_y: pl.Series, series_x: pl.Series) -> float:
        """Calculate OLS Hedge Ratio (Beta)"""
        # Simple Linear Regression: y = beta * x + alpha
        # Beta = Cov(x, y) / Var(x)
        # Polars makes this easy if we maintain alignment
        
        # Need to cast to numpy for OLS or use polars covariance
        y = series_y.to_numpy()
        x = series_x.reshape((-1, 1)).to_numpy()
        
        # Using numpy lstsq for robust OLS
        # Add constant for intercept
        try:
            A = np.vstack([x.T, np.ones(len(x))]).T
            m, c = np.linalg.lstsq(A, y, rcond=None)[0]
            return float(m)
        except Exception:
            # Fallback (e.g. if len is too small)
            return 1.0

    async def run_backtest(self, request: BacktestRequest) -> BacktestResponse:
        # 1. Fetch Data
        # Default lookback to 5 years for meaningful backtest
        start_date = date.today() - timedelta(days=365*5)
        
        df1 = self.get_data_for_ticker(request.ticker_1, start_date)
        df2 = self.get_data_for_ticker(request.ticker_2, start_date)
        
        if df1.height < 50 or df2.height < 50:
             raise ValueError("Insufficient data for simulation")

        # 2. Align Data (Inner Join on Date)
        df1 = df1.rename({"close": "c1"})
        df2 = df2.rename({"close": "c2"})
        
        df = df1.join(df2, on="date", how="inner")
        
        # Check alignment again
        if df.height < 50:
            raise ValueError("Insufficient overlapping data")

        # 3. Calculate Hedge Ratio (Static for this simple version, typically Rolling OLS is used but standard is static HR + Rolling Z)
        # We will use Static OLS on the first year (train) or full dataset? 
        # Standard simple approach: Static Hedge Ratio on full history for spread stability, Rolling Z for Entry
        hedge_ratio = self.calculate_hedge_ratio(df["c1"], df["c2"])
        
        # 4. Spread & Z-Score
        # Spread = Y - HR * X
        # Z-Score = (Spread - RollingMean) / RollingStd
        
        df = df.with_columns([
            (pl.col("c1") - hedge_ratio * pl.col("c2")).alias("spread")
        ])
        
        # Rolling Z-Score
        # Use 'rolling_mean' and 'rolling_std'
        window = request.lookback_window
        
        df = df.with_columns([
            pl.col("spread").rolling_mean(window_size=window).alias("spread_mean"),
            pl.col("spread").rolling_std(window_size=window).alias("spread_std")
        ])
        
        # Drop NaNs created by rolling
        df = df.drop_nulls()
        
        df = df.with_columns([
            ((pl.col("spread") - pl.col("spread_mean")) / pl.col("spread_std")).alias("z_score")
        ])
        
        # 5. Signal Generation (Vectorized)
        # State machine is hard in pure vector, but we can approximate or use iterating if needed.
        # Pure vector approach for Entry/Exit/Stop requires tracking 'position' state.
        # Standard Vectorized Shortcut: 
        #   Long = Z < -Entry
        #   Short = Z > Entry
        #   Exit = abs(Z) < Exit OR abs(Z) > Stop
        # This is stateless (doesn't hold position until exit). Implementation of "holding" in vector is tricky (forward fill).
        
        # Let's do a semi-vectorized state loop for accuracy, or `when/then` chains
        
        # We'll use a fast iteration for the Signal State Machine because "Holding until Exit condition" is path-dependent
        # Polars iteration is fast enough for 1000 rows.
        
        z_scores = df["z_score"].to_list()
        
        signals = [0] * len(z_scores)
        position = 0 # 0, 1 (Long Spread), -1 (Short Spread)
        
        entry_z = request.entry_z
        exit_z = request.exit_z
        stop_z = request.stop_loss_z
        
        for i in range(len(z_scores)):
            z = z_scores[i]
            
            if position == 0:
                if z < -entry_z:
                    position = 1 # Long Spread (Long A, Short B)
                elif z > entry_z:
                    position = -1 # Short Spread (Short A, Long B)
            elif position == 1:
                if z > -exit_z or z < -stop_z: # Revert to mean (profit) or Stop Loss
                    position = 0
            elif position == -1:
                if z < exit_z or z > stop_z: # Revert to mean (profit) or Stop Loss
                    position = 0
            
            signals[i] = position
            
        df = df.with_columns(pl.Series("position", signals))
        
        # 6. PnL Calculation
        # Returns of Spread? No, return of Strategy = Position(t-1) * (Return A - HR * Return B) ???
        # Better: Daily PnL = Position(t-1) * (PriceSpread(t) - PriceSpread(t-1))
        # But wait, Position 1 means "Long 1 unit of Spread". 
        # Spread = P1 - HR*P2. 
        # Change in Spread = (P1_t - HR*P2_t) - (P1_t-1 - HR*P2_t-1)
        # Roughly captures PnL.
        
        df = df.with_columns([
            (pl.col("spread") - pl.col("spread").shift(1)).alias("spread_change"),
            pl.col("c1").pct_change().fill_null(0).alias("ret_1") # Benchmark Return
        ])
        
        # Strategy Daily PnL ($) per unit traded
        # For simplicity in % terms, let's assume Capital = Price 1 + HR * Price 2 at start?
        # A bit complex to normalize to %. 
        # Let's simplify: Return = Position(lag1) * SpreadChange / CostBasis(approx)
        # Cost Basis approx = c1 + beta * c2
        
        df = df.with_columns([
            (pl.col("c1") + hedge_ratio * pl.col("c2")).alias("capital_inv")
        ])
        
        df = df.with_columns([
            (pl.col("position").shift(1).fill_null(0) * pl.col("spread_change") / pl.col("capital_inv")).alias("strat_ret")
        ])
        
        df = df.drop_nulls()
        
        # Equity Curves
        df = df.with_columns([
            (1 + pl.col("strat_ret")).cum_prod().alias("equity_curve"),
            (1 + pl.col("ret_1")).cum_prod().alias("benchmark_curve")
        ])
        
        # 7. Metrics
        # Max Drawdown
        eq = df["equity_curve"].to_numpy()
        running_max = np.maximum.accumulate(eq)
        drawdown = (eq - running_max) / running_max
        
        total_return = eq[-1] - 1
        
        # Sharpe (Annualized) 252 days
        daily_rets = df["strat_ret"].to_numpy()
        sharpe = 0.0
        if np.std(daily_rets) > 0:
            sharpe = (np.mean(daily_rets) / np.std(daily_rets)) * np.sqrt(252)
            
        # Win Rate
        wins = np.sum(daily_rets > 0)
        total_trades = np.sum(daily_rets != 0)
        win_rate = wins / total_trades if total_trades > 0 else 0
        
        # Convert Dates to str
        dates_str = [d.isoformat() for d in df["date"].to_list()]
        
        return BacktestResponse(
            dates=dates_str,
            equity_curve=df["equity_curve"].to_list(),
            benchmark_curve=df["benchmark_curve"].to_list(),
            drawdown=drawdown.tolist(),
            metrics={
                "total_return": float(total_return),
                "sharpe_ratio": float(sharpe),
                "max_drawdown": float(np.min(drawdown)),
                "win_rate": float(win_rate),
                "hedge_ratio": float(hedge_ratio)
            }
        )
