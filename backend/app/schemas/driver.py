from pydantic import BaseModel, Field
from typing import Optional

class Location(BaseModel):
    lat: float
    lng: float

class DriverProfileCreate(BaseModel):
    vehicle_model: str = Field(..., min_length=2, max_length=50)
    license_plate: str = Field(..., min_length=2, max_length=20)
    capacity: int = Field(default=4, ge=1, le=8)

class DriverProfileResponse(BaseModel):
    id: str
    user_id: str
    vehicle_model: str
    license_plate: str
    capacity: int
    status: str
    current_location: Optional[Location] = None
