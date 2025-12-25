from fastapi import APIRouter, HTTPException
from app.schemas.backtest import BacktestRequest, BacktestResponse
from app.services.backtest_service import BacktestService

router = APIRouter(prefix="/backtest", tags=["backtest"])
service = BacktestService()

@router.post("/pairs", response_model=BacktestResponse)
async def backtest_pairs(request: BacktestRequest):
    """
    Run a vectorized backtest for a pairs trading strategy.
    
    - Calculates Hedge Ratio (OLS)
    - Generates signals based on Z-Score thresholds
    - Simulates PnL and returns Equity Curve + Metrics
    """
    try:
        result = await service.run_backtest(request)
        return result
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Backtest execution failed: {str(e)}")
