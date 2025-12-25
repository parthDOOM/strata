from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any

from app.services.news_service import news_service

router = APIRouter()

@router.get("/global", response_model=List[Dict[str, Any]])
async def get_global_news(tickers: List[str] = Query(None)):
    """
    Get aggregated global financial news.
    """
    try:
        news = await news_service.fetch_global_news(tickers=tickers)
        return news
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
