from fastapi import APIRouter, HTTPException
from app.services.hrp_service import HRPService
from app.schemas.portfolio import OptimizationRequest, OptimizationResponse

router = APIRouter(prefix="/portfolio", tags=["Portfolio Optimization"])

@router.post("/optimize/hrp", response_model=OptimizationResponse)
def optimize_hrp(request: OptimizationRequest):
    """
    Perform Hierarchical Risk Parity optimization.
    Returns optimal weights for the given tickers.
    """
    service = HRPService()
    try:
        allocations = service.get_hrp_allocation(request.tickers)
        return {"allocations": allocations, "risk_metric": "HRP"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
