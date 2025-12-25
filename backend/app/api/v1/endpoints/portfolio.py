from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List

from app.core.db import get_session
from app.models.portfolio import Portfolio, PortfolioItem
from app.models.market_data import DailyPrice
from app.schemas.portfolio import (
    OptimizationRequest, OptimizationResponse,
    PortfolioCreate, PortfolioRead, PortfolioItemCreate, PortfolioPerformance
)
from app.services.hrp_service import HRPService

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])

# --- Optimization ---
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

# --- Portfolio Management ---

@router.get("/", response_model=List[PortfolioRead])
def list_portfolios(session: Session = Depends(get_session)):
    """List all portfolios."""
    portfolios = session.exec(select(Portfolio)).all()
    return portfolios

@router.post("/", response_model=PortfolioRead)
def create_portfolio(portfolio: PortfolioCreate, session: Session = Depends(get_session)):
    """Create a new portfolio."""
    db_portfolio = Portfolio.model_validate(portfolio)
    session.add(db_portfolio)
    session.commit()
    session.refresh(db_portfolio)
    return db_portfolio

@router.get("/{portfolio_id}", response_model=PortfolioRead)
def get_portfolio(portfolio_id: int, session: Session = Depends(get_session)):
    """Get portfolio by ID."""
    portfolio = session.get(Portfolio, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return portfolio

@router.delete("/{portfolio_id}", status_code=204)
def delete_portfolio(portfolio_id: int, session: Session = Depends(get_session)):
    """Delete a portfolio."""
    portfolio = session.get(Portfolio, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    session.delete(portfolio)
    session.commit()
    return None

@router.post("/{portfolio_id}/items", response_model=PortfolioRead)
def add_portfolio_item(
    portfolio_id: int, 
    item: PortfolioItemCreate, 
    session: Session = Depends(get_session)
):
    """Add an item (ticker) to a portfolio."""
    portfolio = session.get(Portfolio, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Check if item already exists, if so update quantity? For now just add new row
    # Ideally should aggregate, but simple add for now
    db_item = PortfolioItem(portfolio_id=portfolio_id, **item.model_dump())
    session.add(db_item)
    session.commit()
    session.refresh(portfolio)
    return portfolio

@router.get("/{portfolio_id}/performance", response_model=PortfolioPerformance)
def get_portfolio_performance(portfolio_id: int, session: Session = Depends(get_session)):
    """
    Calculate portfolio performance.
    Fetches latest prices for all items and calculates total value and simple equity curve.
    """
    portfolio = session.get(Portfolio, portfolio_id)
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # --- Real Performance Calculation ---
    
    # 1. Map holdings for easy access
    portfolio_holdings = {item.symbol: item.quantity for item in portfolio.items}
    symbols = list(portfolio_holdings.keys())
    
    if not symbols:
         return {
            "portfolio_id": portfolio.id,
            "total_value": 0.0,
            "daily_return_pct": 0.0,
            "equity_curve": [],
            "holdings": []
        }

    # 2. Fetch Historical Prices for all symbols in one go
    # We'll get last 90 days of data to build a decent curve
    from datetime import date, timedelta
    ninety_days_ago = date.today() - timedelta(days=90)
    
    statement = select(DailyPrice).where(
        DailyPrice.symbol.in_(symbols),
        DailyPrice.trade_date >= ninety_days_ago
    ).order_by(DailyPrice.trade_date)
    
    historical_prices = session.exec(statement).all()
    
    # 3. Organize prices by Date -> Symbol -> Price
    # Structure: { date: { symbol: price } }
    price_map = {}
    for row in historical_prices:
        if row.trade_date not in price_map:
            price_map[row.trade_date] = {}
        price_map[row.trade_date][row.symbol] = row.adjusted_close

    # 4. Build Equity Curve
    equity_curve = []
    
    sorted_dates = sorted(price_map.keys())
    
    # Track last known prices to handle gaps (forward fill)
    last_known_prices = {s: 0.0 for s in symbols} 
    
    # Initialize last known with the first available data points if possible
    # (Or just let the loop handle it, defaulting to 0 until data appears)

    for d in sorted_dates:
        daily_prices = price_map[d]
        
        # Update last known
        for s, p in daily_prices.items():
            last_known_prices[s] = p
            
        # Calculate Portfolio Value for this date
        daily_total_value = 0.0
        for symbol, qty in portfolio_holdings.items():
            price = last_known_prices.get(symbol, 0.0)
            # If we don't have a price yet (start of history), try current daily query or skip
            # For simplicity, we assume if 0 it acts as 0. 
            # In a real app we might backfill or fetch strictly aligned data.
            daily_total_value += price * qty
            
        equity_curve.append({
            "date": d.isoformat(),
            "value": daily_total_value
        })

    # 5. Current Snapshot (Holdings)
    # We can use the very last state of last_known_prices for "current price"
    # or fetch the single latest row if we want up-to-the-minute.
    # The existing loop below does a fresh fetch per symbol, which is fine for small N.
    # Let's optimize it to use our last_known_prices if fresh enough, or just keep existing loop for safety.
    # Actually, sticking to the existing loop for "Holdings" list is safer for "latest available" 
    # if our 90-day history query missed today's live data (though DailyPrice is usually EOD).
    
    total_value = 0.0
    holdings_data = []
    
    for item in portfolio.items:
        # Get latest price explicitly to ensure we have the absolute latest DB has
        # (Re-using the loop logic from before, but slightly cleaner)
        statement = select(DailyPrice).where(DailyPrice.symbol == item.symbol).order_by(DailyPrice.trade_date.desc()).limit(1)
        latest_row = session.exec(statement).first()
        
        current_price = latest_row.close if latest_row else item.average_price
        # Fallback to last_known from history if DB fetch fails (unlikely)
        if not latest_row and item.symbol in last_known_prices:
             current_price = last_known_prices[item.symbol]

        market_value = current_price * item.quantity
        total_value += market_value
        
        holdings_data.append({
            "symbol": item.symbol,
            "quantity": item.quantity,
            "avg_price": item.average_price,
            "current_price": current_price,
            "market_value": market_value,
            "gain_loss": (current_price - item.average_price) * item.quantity
        })

    # 6. Calculate Daily Return
    daily_return_pct = 0.0
    if len(equity_curve) >= 2:
        last_val = equity_curve[-1]["value"]
        prev_val = equity_curve[-2]["value"]
        if prev_val > 0:
            daily_return_pct = ((last_val - prev_val) / prev_val) * 100

    return {
        "portfolio_id": portfolio.id,
        "total_value": total_value,
        "daily_return_pct": daily_return_pct,
        "equity_curve": equity_curve,
        "holdings": holdings_data
    }
