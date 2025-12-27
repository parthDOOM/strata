"""
Options Service.

Fetches and processes options chain data for Volatility Surface analysis.
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, date
from functools import lru_cache
from typing import Dict, List, Any, Optional

# Caching at module level to persist across request instances if service is instantiated per request
# Caching removed for debugging
# @lru_cache(maxsize=32)
def get_cached_options_data(ticker_symbol: str) -> Dict[str, Any]:
    print(f"DEBUG: Processing options for {ticker_symbol}")
    """
    Fetch and process options data. Cached to prevent spamming YFinance.
    """
    ticker = yf.Ticker(ticker_symbol)
    
    try:
        expirations = ticker.options
    except Exception:
        # Ticker might not exist or no options
        return {"x": [], "y": [], "z": [], "error": "No options found"}

    if not expirations:
        return {"x": [], "y": [], "z": [], "error": "No options found"}

    # Limit to next 12 expirations to save time/bandwidth
    target_expirations = expirations[:12]
    
    all_calls = []
    today = date.today()
    
    for exp_str in target_expirations:
        try:
            # Fetch chain
            chain = ticker.option_chain(exp_str)
            calls = chain.calls
            
            if calls.empty:
                continue
                
            # Filter garbage data
            # Volume > 5, OI > 5, 0.01 < IV < 3.0
            mask = (
                (calls['volume'] > 5) & 
                (calls['openInterest'] > 5) & 
                (calls['impliedVolatility'] > 0.01) & 
                (calls['impliedVolatility'] < 3.0)
            )
            filtered_calls = calls[mask].copy()
            
            if filtered_calls.empty:
                continue
            
            # Calculate days to expiry
            exp_date = datetime.strptime(exp_str, "%Y-%m-%d").date()
            days_to_expiry = (exp_date - today).days
            
            if days_to_expiry <= 0:
                continue
                
            filtered_calls['daysToExpiry'] = days_to_expiry
            
            # Keep relevant columns
            all_calls.append(filtered_calls[['strike', 'daysToExpiry', 'impliedVolatility']])
            
        except Exception as e:
            print(f"Error fetching expiry {exp_str}: {e}")
            continue
            
    if not all_calls:
        return {"x": [], "y": [], "z": [], "error": "No valid data after filtering"}
        
    # Combine all
    final_df = pd.concat(all_calls, ignore_index=True)
    
    # Return structure for Plotly
    # x: strikes, y: days, z: volatility
    # Note: Plotly Mesh3D or Surface prefers list of points or grid.
    # For a simple scatter3d/mesh, lists are fine. 
    # For 'surface', it usually wants a 2D grid (matrix).
    # However, creating a dense grid from sparse option data requires interpolation.
    # The requirement says "return a structure: x, y, z". Plotly JS can plot 'mesh3d' from arrays.
    # Or 'scatter3d'. 'surface' strictly requires a 2D array z with x and y vectors.
    # If we want a true surface, we need to interpolate.
    # User said: "scipy... for interpolation if needed".
    # BUT "yfinance provides impliedVolatility... utilize those".
    # Let's simple return the points. Frontend can use Mesh3D or we interpolate here.
    # To keep backend simple and fast, getting raw points is safer. 
    # But prompt asks for "Visualize the Implied Volatility Surface".
    # Plotly 'mesh3d' with 'intensity' set to z creates a surface-like look from points.
    # Let's return raw points lists.
    
    # Get Spot Price for Greeks
    try:
        spot_price = ticker.fast_info.last_price
    except:
        # Fallback
        hist = ticker.history(period="1d")
        if not hist.empty:
            spot_price = hist['Close'].iloc[-1]
        else:
            spot_price = 100.0 # Fallback default
    
    # Calculate Greeks via C++ Engine
    num_rows = len(final_df)
    deltas = [0.0] * num_rows
    gammas = [0.0] * num_rows
    vegas = [0.0] * num_rows
    thetas = [0.0] * num_rows
    rhos = [0.0] * num_rows
    
    try:
        from app.engine import monte_carlo_engine
        
        # Ensure spot_price is float
        if spot_price is None:
            spot_price = 100.0
        spot_price = float(spot_price)

        for i, (_, row) in enumerate(final_df.iterrows()):
            try:
                k = float(row['strike'])
                # avoid division by zero if daysToExpiry is 0 (though we filtered <=0)
                t = max(float(row['daysToExpiry']) / 365.0, 0.001)
                sigma = float(row['impliedVolatility'])
                
                # Assuming Risk Free Rate = 4.5%
                r = 0.045
                
                greeks = monte_carlo_engine.calculate_greeks(
                    strike=k,
                    time_to_expiry=t,
                    spot=spot_price,
                    risk_free_rate=r,
                    volatility=sigma,
                    is_call=True
                )
                
                deltas[i] = greeks.delta
                gammas[i] = greeks.gamma
                vegas[i] = greeks.vega
                thetas[i] = greeks.theta
                rhos[i] = greeks.rho
            except Exception as e_row:
                # Log occasional row error but continue
                print(f"Row {i} error: {e_row}")
                continue
            
    except ImportError:
        print("Greeks engine not available (ImportError). Using zeros.")
    except Exception as e:
        print(f"Error initializing Greeks engine: {e}")
    
    return {
        "x": final_df['strike'].tolist(),
        "y": final_df['daysToExpiry'].tolist(),
        "z": final_df['impliedVolatility'].tolist(),
        "delta": deltas,
        "gamma": gammas,
        "vega": vegas,
        "theta": thetas,
        "rho": rhos
    }

class OptionsService:
    def get_iv_surface(self, ticker: str) -> Dict[str, Any]:
        """
        Get IV surface data for a ticker.
        """
        return get_cached_options_data(ticker.upper())
