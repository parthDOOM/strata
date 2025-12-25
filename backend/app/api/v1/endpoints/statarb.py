"""
Statistical Arbitrage API endpoints.
"""
from typing import List
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Query
from sqlmodel import Session, select
from app.core.db import get_session, engine
from app.models.statarb import CointegratedPair
from app.services.cointegration import CointegrationService
from app.schemas.statarb import AnalysisRequest, AnalysisResponse, SpreadPoint

router = APIRouter(prefix="/statarb", tags=["StatArb"])

def run_analysis_task(universe: List[str]):
    """Background task to run pairs analysis."""
    with Session(engine) as session:
        service = CointegrationService()
        service.find_pairs(universe, session)

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_pairs(
    request: AnalysisRequest, 
    background_tasks: BackgroundTasks
):
    """
    Start a cointegration analysis on the provided universe.
    Runs in the background.
    """
    background_tasks.add_task(run_analysis_task, request.universe)
    return {"message": f"Analysis started for {len(request.universe)} tickers", "status": "processing"}

@router.get("/pairs", response_model=List[CointegratedPair])
async def get_pairs(session: Session = Depends(get_session)):
    """Get list of active cointegrated pairs."""
    return session.exec(select(CointegratedPair).where(CointegratedPair.is_active == True)).all()

@router.get("/spread", response_model=List[SpreadPoint])
async def get_spread(
    ticker1: str = Query(...),
    ticker2: str = Query(...),
    session: Session = Depends(get_session)
):
    """Get historical Z-Score spread for visualization."""
    service = CointegrationService()
    data = service.get_spread_series(ticker1, ticker2, session)
    if not data:
        raise HTTPException(status_code=404, detail="Insufficient data for pair")
    return data
