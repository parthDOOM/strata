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

    def _run_strategy(self, df: pl.DataFrame, entry_z: float, exit_z: float, stop_loss_z: float, hedge_ratio: float) -> Dict[str, Any]:
        """Run strategy for specific parameters and return metrics/curves"""
        # Fast iteration for Signal State Machine
        z_scores = df["z_score"].to_list()
        
        signals = [0] * len(z_scores)
        position = 0 # 0, 1 (Long Spread), -1 (Short Spread)
        
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
            
        # PnL Calculation
        df_strat = df.with_columns(pl.Series("position", signals))
        
        df_strat = df_strat.with_columns([
            (pl.col("spread") - pl.col("spread").shift(1)).alias("spread_change"),
            pl.col("c1").pct_change().fill_null(0).alias("ret_1"), # Benchmark Return
            (pl.col("c1") + hedge_ratio * pl.col("c2")).alias("capital_inv")
        ])
        
        df_strat = df_strat.with_columns([
            (pl.col("position").shift(1).fill_null(0) * pl.col("spread_change") / pl.col("capital_inv")).alias("strat_ret")
        ])
        
        df_strat = df_strat.drop_nulls()
        
        # Equity Curves
        df_strat = df_strat.with_columns([
            (1 + pl.col("strat_ret")).cum_prod().alias("equity_curve"),
            (1 + pl.col("ret_1")).cum_prod().alias("benchmark_curve")
        ])
        
        # Metrics
        eq = df_strat["equity_curve"].to_numpy()
        running_max = np.maximum.accumulate(eq)
        drawdown = (eq - running_max) / running_max
        
        total_return = eq[-1] - 1
        
        daily_rets = df_strat["strat_ret"].to_numpy()
        sharpe = 0.0
        if np.std(daily_rets) > 0:
            sharpe = (np.mean(daily_rets) / np.std(daily_rets)) * np.sqrt(252)
            
        wins = np.sum(daily_rets > 0)
        total_trades = np.sum(daily_rets != 0)
        win_rate = wins / total_trades if total_trades > 0 else 0

        return {
            "metrics": {
                "total_return": float(total_return),
                "sharpe_ratio": float(sharpe),
                "max_drawdown": float(np.min(drawdown)),
                "win_rate": float(win_rate),
                "hedge_ratio": float(hedge_ratio),
                "trades": int(total_trades)
            },
            "equity_curve": df_strat["equity_curve"].to_list(),
            "benchmark_curve": df_strat["benchmark_curve"].to_list(),
            "drawdown": drawdown.tolist(),
            "dates": [d.isoformat() for d in df_strat["date"].to_list()]
        }

    async def run_backtest(self, request: BacktestRequest) -> BacktestResponse:
        # 1. Fetch Data
        start_date = date.today() - timedelta(days=365*5)
        df1 = self.get_data_for_ticker(request.ticker_1, start_date)
        df2 = self.get_data_for_ticker(request.ticker_2, start_date)
        
        if df1.height < 50 or df2.height < 50:
             raise ValueError("Insufficient data for simulation")

        # 2. Align Data
        df1 = df1.rename({"close": "c1"})
        df2 = df2.rename({"close": "c2"})
        df = df1.join(df2, on="date", how="inner")
        
        if df.height < 50:
            raise ValueError("Insufficient overlapping data")

        # 3. Calculate Hedge Ratio
        hedge_ratio = self.calculate_hedge_ratio(df["c1"], df["c2"])
        
        # 4. Spread & Z-Score
        df = df.with_columns([
            (pl.col("c1") - hedge_ratio * pl.col("c2")).alias("spread")
        ])
        
        window = request.lookback_window
        df = df.with_columns([
            pl.col("spread").rolling_mean(window_size=window).alias("spread_mean"),
            pl.col("spread").rolling_std(window_size=window).alias("spread_std")
        ])
        
        df = df.drop_nulls()
        df = df.with_columns([
            ((pl.col("spread") - pl.col("spread_mean")) / pl.col("spread_std")).alias("z_score")
        ])
        
        # 5. Main Run
        main_result = self._run_strategy(
            df, request.entry_z, request.exit_z, request.stop_loss_z, hedge_ratio
        )
        
        sensitivity_matrix = []
        
        # 6. Grid Search (Optional)
        if request.entry_z_min is not None and request.entry_z_max is not None:
            # Generate ranges
            entry_step = request.entry_z_step or 0.5
            exit_step = request.exit_z_step or 0.5
            
            entry_range = np.arange(request.entry_z_min, request.entry_z_max + 0.1, entry_step)
            exit_range = np.arange(request.exit_z_min, request.exit_z_max + 0.1, exit_step)
            
            for ez in entry_range:
                for ex in exit_range:
                    if ex >= ez: continue # Skip invalid parameters (Exit >= Entry is usually nonsense for mean reversion)
                    
                    res = self._run_strategy(df, float(ez), float(ex), request.stop_loss_z, hedge_ratio)
                    m = res["metrics"]
                    
                    sensitivity_matrix.append({
                        "entry_z": float(ez),
                        "exit_z": float(ex),
                        "sharpe_ratio": m["sharpe_ratio"],
                        "total_return": m["total_return"],
                        "win_rate": m["win_rate"],
                        "trades": m["trades"]
                    })

        return BacktestResponse(
            dates=main_result["dates"],
            equity_curve=main_result["equity_curve"],
            benchmark_curve=main_result["benchmark_curve"],
            drawdown=main_result["drawdown"],
            metrics=main_result["metrics"],
            sensitivity_matrix=sensitivity_matrix if sensitivity_matrix else None
        )
