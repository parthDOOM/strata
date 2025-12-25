import numpy as np
import pandas as pd
import scipy.cluster.hierarchy as sch
import scipy.spatial.distance as ssd
from typing import List, Dict
from sqlmodel import Session, select
from app.core.db import engine
from app.models.market_data import DailyPrice
import polars as pl

class HRPService:
    def get_hrp_allocation(self, tickers: List[str]) -> List[Dict[str, float]]:
        if len(tickers) < 2:
            return [{"ticker": t, "weight": 1.0} for t in tickers]

        df = self._fetch_data(tickers)
        if df.shape[0] < 30: # constrain to at least 30 days
            raise ValueError("Insufficient overlapping history (min 30 days)")

        # Log returns
        returns = np.log(df / df.shift(1)).dropna()
        
        # Covariance and Correlation
        cov = returns.cov()
        corr = returns.corr()
        
        # 1. Clustering
        dist = ssd.pdist(corr, metric='euclidean') # Actually standard is (1-corr) or sqrt(2*(1-corr))
        # Distance matrix based on correlation
        # d_ij = sqrt(0.5 * (1 - rho_ij))
        dist_matrix = np.sqrt(0.5 * (1 - corr))
        link = sch.linkage(ssd.squareform(dist_matrix), method='single')
        
        # 2. Quasi-Diagonalization
        sort_ix = self._get_quasi_diag(link)
        sort_ix = corr.index[sort_ix].tolist() # Reordered tickers
        
        # Reorder covariance
        df_cov = cov.loc[sort_ix, sort_ix]
        
        # 3. Recursive Bisection
        weights = self._get_rec_bisection(df_cov, sort_ix)
        
        # Format result
        sorted_weights = sorted(
            [{"ticker": t, "weight": round(w, 4)} for t, w in weights.items()],
            key=lambda x: x["weight"],
            reverse=True
        )
        return sorted_weights

    def _fetch_data(self, tickers: List[str]) -> pd.DataFrame:
        query = select(DailyPrice.symbol, DailyPrice.trade_date, DailyPrice.adjusted_close).where(DailyPrice.symbol.in_(tickers))
        with Session(engine) as session:
            results = session.exec(query).all()
            if not results:
                raise ValueError("No data found for tickers")
            
            # Use Polars for pivot
            data = [
                {"symbol": r.symbol, "date": r.trade_date, "price": float(r.adjusted_close)}
                for r in results
            ]
            import polars as pl
            df_pl = pl.DataFrame(data)
            
            # Pivot
            df_pivot = df_pl.pivot(index="date", columns="symbol", values="price")
            df_pivot = df_pivot.drop_nulls() # Inner join logic (drop rows with ANY nulls)
            
            # Check overlap
            if df_pivot.height == 0:
                 raise ValueError("No overlapping history found for these assets")
            
            # Convert to pandas
            pdf = df_pivot.to_pandas()
            pdf.set_index("date", inplace=True)
            pdf.sort_index(inplace=True)
            return pdf

    def _get_quasi_diag(self, link):
        # Sort clustered items by distance
        link = link.astype(int)
        sort_ix = pd.Series([link[-1, 0], link[-1, 1]])
        num_items = link[-1, 3] # number of original items
        
        while sort_ix.max() >= num_items:
            sort_ix.index = range(0, sort_ix.shape[0] * 2, 2) # make space
            df0 = sort_ix[sort_ix >= num_items] # clusters
            i = df0.index
            j = df0.values - num_items
            sort_ix[i] = link[j, 0] # item 1
            df0 = pd.Series(link[j, 1], index=i + 1)
            sort_ix = pd.concat([sort_ix, df0])
            sort_ix = sort_ix.sort_index()
            sort_ix.index = range(sort_ix.shape[0])
            
        return sort_ix.tolist()

    def _get_rec_bisection(self, cov: pd.DataFrame, sort_ix: List[str]) -> pd.Series:
        w = pd.Series(1, index=sort_ix)
        c_items = [sort_ix]
        
        while len(c_items) > 0:
            c_items = [i[j:k] for i in c_items for j, k in ((0, len(i) // 2), (len(i) // 2, len(i))) if len(i) > 1]
            for i in range(0, len(c_items), 2):
                c_items0 = c_items[i] # cluster 1
                c_items1 = c_items[i+1] # cluster 2
                
                c_var0 = self._get_cluster_var(cov, c_items0)
                c_var1 = self._get_cluster_var(cov, c_items1)
                
                alpha = 1 - c_var0 / (c_var0 + c_var1)
                w[c_items0] *= alpha
                w[c_items1] *= 1 - alpha
                
        return w

    def _get_cluster_var(self, cov, c_items):
        cov_slice = cov.loc[c_items, c_items]
        w = self._get_ivp(cov_slice).values.reshape(-1, 1)
        c_var = np.dot(np.dot(w.T, cov_slice), w)[0, 0]
        return c_var

    def _get_ivp(self, cov):
        # Inverse Variance Portfolio
        iv = 1 / np.diag(cov)
        iv /= iv.sum()
        return pd.Series(iv, index=cov.index)
