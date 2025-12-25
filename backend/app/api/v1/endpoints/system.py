import os
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select, func, text
from app.core.db import get_session
from app.models.market_data import DailyPrice, Ticker
from app.core.config import settings
from pydantic import BaseModel

router = APIRouter(prefix="/system", tags=["system"])

class SystemHealthResponse(BaseModel):
    ticker_count: int
    price_rows: int
    db_size_mb: float
    status: str

@router.get("/health", response_model=SystemHealthResponse)
def get_system_health(db: Session = Depends(get_session)):
    """
    Get system health statistics.
    """
    try:
        ticker_count = db.exec(select(func.count(Ticker.symbol))).one()
        price_rows = db.exec(select(func.count(DailyPrice.id))).one()
        
        # Calculate DB size
        try:
            if settings.database_url.startswith("sqlite:///"):
                # Extract path from sqlite:///path/to/db
                path_str = settings.database_url.replace("sqlite:///", "")
                
                # Resolving logic
                if os.path.isabs(path_str):
                    path = path_str
                else:
                    # Try resolving relative to CWD
                    path = os.path.abspath(path_str)
                    
                if not os.path.exists(path):
                     # Fallback check relative to backend/app if needed (though abspath should handle it if CWD is correct)
                     # Let's try to just print what we found for debugging
                     print(f"DEBUG: Calculated DB path: {path} (Exists: {os.path.exists(path)})")
                     pass

                if os.path.exists(path):
                    size_mb = os.path.getsize(path) / (1024 * 1024)
                else:
                    size_mb = 0.0
            else:
                size_mb = 0.0 
        except Exception as e:
            print(f"DEBUG: Error calculating DB size: {e}")
            size_mb = 0.0

        return SystemHealthResponse(
            ticker_count=ticker_count,
            price_rows=price_rows,
            db_size_mb=round(size_mb, 2),
            status="ok"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/maintenance/prune")
def prune_empty_tickers(db: Session = Depends(get_session)):
    """
    Remove tickers that have no price data.
    """
    try:
        # Find tickers with 0 prices
        # This is a bit complex in pure ORM without subqueries, so raw SQL or python logic is easier for small scale
        # Python logic:
        tickers = db.exec(select(Ticker)).all()
        deleted_count = 0
        for ticker in tickers:
            count = db.exec(select(func.count(DailyPrice.id)).where(DailyPrice.symbol == ticker.symbol)).one()
            if count == 0:
                db.delete(ticker)
                deleted_count += 1
        
        db.commit()
        return {"deleted_count": deleted_count, "message": f"Removed {deleted_count} empty tickers"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class ClearDataRequest(BaseModel):
    confirm: bool

@router.post("/maintenance/clear-all")
def clear_all_data(request: ClearDataRequest, db: Session = Depends(get_session)):
    """
    DANGER: Delete ALL market data.
    """
    if not request.confirm:
        raise HTTPException(status_code=400, detail="Confirmation required")
    
    try:
        # Truncate is faster but requires specific SQL support. Delete is safer for ORM.
        db.exec(text("DELETE FROM dailyprice"))
        db.commit()
        return {"message": "All market data deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
