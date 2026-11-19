from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.middleware.auth_middleware import require_passenger
from app.services.location_service import calculate_distance
from app.services.ai_service import generate_fare_explanation

router = APIRouter()

class FareEstimateRequest(BaseModel):
    pickup_lat: float
    pickup_lng: float
    dest_lat: float
    dest_lng: float

class FareEstimateResponse(BaseModel):
    distance_km: float
    base_fare: float
    per_km_rate: float
    total_fare: float
    ai_explanation: str

@router.post("/estimate-fare", response_model=FareEstimateResponse)
async def estimate_fare(req: FareEstimateRequest, current_user: dict = Depends(require_passenger)):
    # 1. Deterministic distance
    dist = calculate_distance(req.pickup_lat, req.pickup_lng, req.dest_lat, req.dest_lng)
    distance_km = round(dist, 2)
    
    # 2. Deterministic fare
    base_fare = 50.0
    per_km_rate = 12.0
    
    total_fare = round(base_fare + (distance_km * per_km_rate))
    
    # 3. AI Explanation (Graceful fallback)
    ai_explanation = await generate_fare_explanation(distance_km, total_fare, base_fare, per_km_rate)
    
    return FareEstimateResponse(
        distance_km=distance_km,
        base_fare=base_fare,
        per_km_rate=per_km_rate,
        total_fare=total_fare,
        ai_explanation=ai_explanation
    )
