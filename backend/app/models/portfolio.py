from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

class PortfolioBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    user_name: str = Field(default="Guest", index=True)

class Portfolio(PortfolioBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    items: List["PortfolioItem"] = Relationship(back_populates="portfolio", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class PortfolioItemBase(SQLModel):
    symbol: str
    quantity: float
    average_price: float

class PortfolioItem(PortfolioItemBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    portfolio_id: int = Field(foreign_key="portfolio.id")
    
    portfolio: Optional[Portfolio] = Relationship(back_populates="items")
