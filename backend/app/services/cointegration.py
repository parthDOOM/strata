"""
Cointegration Service.

Math engine for finding and analyzing cointegrated pairs for statistical arbitrage.
"""
from typing import List, Tuple, Dict, Any
import numpy as np
import polars as pl
import statsmodels.api as sm
from statsmodels.tsa.stattools import coint, adfuller
from sqlmodel import Session, select, delete

from app.models.market_data import DailyPrice
from app.models.statarb import CointegratedPair


class CointegrationService:
    """Service for calculating cointegration and managing pairs."""

    def calculate_cointegration(self, series_a: np.ndarray, series_b: np.ndarray) -> Tuple[float, float, float]:
        """
        Calculate cointegration between two price series.
        
        Args:
            series_a: Dependent variable (Y)
            series_b: Independent variable (X)
            
        Returns:
            Tuple of (score, p_value, critical_value)
        """
        # Engle-Granger test
        # default autolag='AIC'
        score, p_value, crit_val = coint(series_a, series_b)
        # crit_val is an array for 1%, 5%, 10%
        return score, p_value, crit_val[1] # Return 5% critical value

    def calculate_spread_metrics(self, series_a: np.ndarray, series_b: np.ndarray) -> Dict[str, float]:
        """
        Calculate hedge ratio, half-life, and current z-score.
        
        Args:
            series_a: Dependent variable (Y)
            series_b: Independent variable (X)
            
        Returns:
            Dictionary with metrics
        """
        # 1. Calculate Hedge Ratio using OLS: Y = beta * X + alpha
        X = sm.add_constant(series_b)
        model = sm.OLS(series_a, X).fit()
        hedge_ratio = model.params[1]
        
        # 2. Calculate Spread
        spread = series_a - (hedge_ratio * series_b)
        
        # 3. Calculate Half-Life (Ornstein-Uhlenbeck process)
        # z(t) = spread
        # dz = z(t) - z(t-1)
        # Regress dz against z(t-1)
        z_lag = np.roll(spread, 1)
        z_lag[0] = 0
        dz = spread - z_lag
        
        # Drop first observation derived from lag
        z_lag = z_lag[1:]
        dz = dz[1:]
        
        # Regress dz ~ z_lag + constant
        X_hl = sm.add_constant(z_lag)
        hl_model = sm.OLS(dz, X_hl).fit()
        beta = hl_model.params[1]
        
        # Avoid division by zero or log of positive if beta >= 0 (not mean reverting)
        if beta >= 0:
            half_life = 9999.0
        else:
            half_life = -np.log(2) / beta

        # 4. Calculate Z-Score
        # Using rolling window or full history? Usually full history for simple stat arb,
        # or a specific lookback window. Here we use the calculated spread series mean/std.
        spread_mean = np.mean(spread)
        spread_std = np.std(spread)
        
        current_z_score = (spread[-1] - spread_mean) / spread_std if spread_std > 0 else 0.0
        
        return {
            "hedge_ratio": hedge_ratio,
            "half_life": half_life,
            "last_z_score": current_z_score,
            "spread_mean": spread_mean,
            "spread_std": spread_std
        }

    def prepare_data(self, tickers: List[str], session: Session) -> pl.DataFrame:
        """Fetch and align data for multiple tickers."""
        # Fetch data
        statement = select(DailyPrice).where(DailyPrice.symbol.in_(tickers)).order_by(DailyPrice.trade_date)
        results = session.exec(statement).all()
        
        if not results:
            return pl.DataFrame()
            
        # Create Polars DataFrame
        data = [
            {"date": r.trade_date, "symbol": r.symbol, "price": r.adjusted_close}
            for r in results
        ]
        df = pl.DataFrame(data)
        
        # Pivot to wide format: Date index, Ticker columns
        df_pivot = df.pivot(index="date", columns="symbol", values="price")
        
        # Forward fill then drop remaining nulls (handling missing days)
        df_pivot = df_pivot.fill_null(strategy="forward").drop_nulls()
        
        return df_pivot.sort("date")

    def find_pairs(self, tickers: List[str], session: Session) -> int:
        """
        Identify cointegrated pairs from the provided universe.
        
        Args:
            tickers: List of ticker symbols to analyze
            session: DB Session
            
        Returns:
            Number of pairs found
        """
        # 0. Clean existing inactive pairs or re-evaluate? 
        # For simplicity, we'll clear pairs for these tickers or just append new ones.
        # Ideally we should update existing ones. Let's truncate table for now or just append.
        # User requirement: "Filter pairs... Save valid pairs".
        # Let's delete existing active pairs to avoid duplicates for now.
        session.exec(delete(CointegratedPair))
        session.commit()
        
        # 1. Prepare Data
        df = self.prepare_data(tickers, session)
        if df.is_empty():
            return 0
            
        available_tickers = [c for c in df.columns if c != "date"]
        pairs_found = 0
        
        # 2. Iterate Logic
        n = len(available_tickers)
        for i in range(n):
            for j in range(i + 1, n):
                t1 = available_tickers[i]
                t2 = available_tickers[j]
                
                s1 = df[t1].to_numpy()
                s2 = df[t2].to_numpy()
                
                # Check lengths match (they should from drop_nulls)
                if len(s1) < 30: # Minimum data requirement
                    continue
                    
                # 3. Calculate Cointegration
                score, p_value, crit_val = self.calculate_cointegration(s1, s2)
                
                if p_value < 0.05:
                    # Found a pair! Calculate metrics
                    metrics = self.calculate_spread_metrics(s1, s2)
                    
                    # 4. Save to DB
                    pair = CointegratedPair(
                        ticker_1=t1,
                        ticker_2=t2,
                        p_value=p_value,
                        hedge_ratio=metrics["hedge_ratio"],
                        half_life=metrics["half_life"],
                        last_z_score=metrics["last_z_score"],
                        is_active=True
                    )
                    session.add(pair)
                    pairs_found += 1
        
        session.commit()
        return pairs_found

    def get_spread_series(self, ticker1: str, ticker2: str, session: Session) -> List[Dict[str, Any]]:
        """Get z-score historical series for visualization."""
        df = self.prepare_data([ticker1, ticker2], session)
        if df.width < 3: # date + 2 tickers
            return []
            
        s1 = df[ticker1].to_numpy()
        s2 = df[ticker2].to_numpy()
        dates = df["date"].to_list()
        
        # Recalculate parameters (dynamic)
        metrics = self.calculate_spread_metrics(s1, s2)
        hedge_ratio = metrics["hedge_ratio"]
        mean = metrics["spread_mean"]
        std = metrics["spread_std"]
        
        spread = s1 - (hedge_ratio * s2)
        z_score = (spread - mean) / std if std > 0 else spread * 0
        
        result = []
        for d, z in zip(dates, z_score):
            result.append({
                "date": d.isoformat(),
                "z_score": float(z)
            })
            
        return result
