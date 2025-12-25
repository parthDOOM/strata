"""
StatArb Pydantic schemas.
"""
from typing import List
from pydantic import BaseModel

class AnalysisRequest(BaseModel):
    universe: List[str]

class SpreadPoint(BaseModel):
    date: str
    z_score: float

class AnalysisResponse(BaseModel):
    message: str
    status: str
