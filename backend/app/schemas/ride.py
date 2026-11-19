from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.driver import Location

class RideRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    dest_lat: float
    dest_lng: float

class RideStatusUpdateRequest(BaseModel):
    status: str

class RideResponse(BaseModel):
    id: str
    passenger_id: str
    driver_id: Optional[str] = None
    pickup: Location
    destination: Location
    status: str
    distance_km: float
    fare: float
    created_at: datetime
    updated_at: datetime
