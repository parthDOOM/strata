"""
Options Analysis API Endpoints.
"""
from fastapi import APIRouter, HTTPException
from app.services.options_service import OptionsService
from app.schemas.options import IVSurfaceResponse

router = APIRouter(prefix="/options", tags=["Options Analysis"])

@router.get("/iv/{ticker}", response_model=IVSurfaceResponse)
def get_iv_surface(ticker: str):
    """
    Get Implied Volatility Surface data for a ticker.
    Returns 3D points (strike, days_to_expiry, iv).
    """
    service = OptionsService()
    try:
        # Note: Service uses synchronous yfinance, but it's cached. 
        # ideally should run in threadpool if slow, but FastAPI does that for def (non-async).
        # But I defined this as async def. If I use async, I should use run_in_threadpool or ensure it's fast.
        # yfinance is blocking. Best to define this as 'def' not 'async def' to let FastAPI manage threads,
        # OR explicitly wrap. 
        # Given potential 5-10s delay, blocking event loop is BAD. 
        # Changed to 'def' (standard synchronous path) implies FastAPI puts it in threadpool.
        # Wait, I am writing `async def`. I should check if `OptionsService` is async. 
        # It is synchronous. So I should use `def` or loop.run_in_executor.
        # Simple fix: make endpoint `def`.
        data = service.get_iv_surface(ticker)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    if "error" in data:
        raise HTTPException(status_code=500, detail=data["error"])
        
    return {
        "ticker": ticker.upper(),
        **data,  # Unpack x, y, z, delta, gamma, etc.
        "count": len(data["x"])
    }
