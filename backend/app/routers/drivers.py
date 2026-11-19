from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.driver import DriverProfileCreate, DriverProfileResponse, Location
from app.middleware.auth_middleware import require_driver
from app.database.mongodb import get_database
from pymongo import ReturnDocument

router = APIRouter(prefix="/api/drivers", tags=["Drivers"])

@router.post("/profile", response_model=DriverProfileResponse)
async def create_or_update_profile(profile: DriverProfileCreate, current_user: dict = Depends(require_driver)):
    db = get_database()
    user_id = current_user["_id"]
    
    # We only update vehicle info, preserving status and location if they exist
    update_data = {
        "vehicle_model": profile.vehicle_model,
        "license_plate": profile.license_plate,
        "capacity": profile.capacity,
    }
    
    result = await db.drivers.find_one_and_update(
        {"user_id": user_id},
        {
            "$set": update_data,
            "$setOnInsert": {"status": "offline", "current_location": None}
        },
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    
    loc = result.get("current_location")
    return DriverProfileResponse(
        id=str(result["_id"]),
        user_id=str(result["user_id"]),
        vehicle_model=result["vehicle_model"],
        license_plate=result["license_plate"],
        capacity=result["capacity"],
        status=result.get("status", "offline"),
        current_location=Location(**loc) if loc else None
    )

@router.get("/profile", response_model=DriverProfileResponse)
async def get_profile(current_user: dict = Depends(require_driver)):
    db = get_database()
    driver = await db.drivers.find_one({"user_id": current_user["_id"]})
    
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
        
    loc = driver.get("current_location")
    return DriverProfileResponse(
        id=str(driver["_id"]),
        user_id=str(driver["user_id"]),
        vehicle_model=driver["vehicle_model"],
        license_plate=driver["license_plate"],
        capacity=driver["capacity"],
        status=driver.get("status", "offline"),
        current_location=Location(**loc) if loc else None
    )

@router.post("/go-online", response_model=DriverProfileResponse)
async def go_online(current_user: dict = Depends(require_driver)):
    db = get_database()
    
    # Ensure profile exists before going online
    driver = await db.drivers.find_one({"user_id": current_user["_id"]})
    if not driver:
        raise HTTPException(status_code=400, detail="Must create profile before going online")
        
    result = await db.drivers.find_one_and_update(
        {"user_id": current_user["_id"]},
        {"$set": {
            "status": "online"
        }},
        return_document=ReturnDocument.AFTER
    )
    
    loc = result.get("current_location")
    return DriverProfileResponse(
        id=str(result["_id"]),
        user_id=str(result["user_id"]),
        vehicle_model=result["vehicle_model"],
        license_plate=result["license_plate"],
        capacity=result["capacity"],
        status=result["status"],
        current_location=Location(**loc) if loc else None
    )

@router.post("/go-offline", response_model=DriverProfileResponse)
async def go_offline(current_user: dict = Depends(require_driver)):
    db = get_database()
    
    driver = await db.drivers.find_one({"user_id": current_user["_id"]})
    if not driver:
        raise HTTPException(status_code=400, detail="Driver profile not found")
        
    result = await db.drivers.find_one_and_update(
        {"user_id": current_user["_id"]},
        {"$set": {"status": "offline"}},
        return_document=ReturnDocument.AFTER
    )
    
    loc = result.get("current_location")
    return DriverProfileResponse(
        id=str(result["_id"]),
        user_id=str(result["user_id"]),
        vehicle_model=result["vehicle_model"],
        license_plate=result["license_plate"],
        capacity=result["capacity"],
        status=result["status"],
        current_location=Location(**loc) if loc else None
    )

from app.middleware.auth_middleware import require_passenger
from app.services.location_service import calculate_distance

@router.get("/nearby")
async def get_nearby_drivers(lat: float, lng: float, radius_km: float = 5.0, current_user: dict = Depends(require_passenger)):
    """Find nearby online drivers within a radius (Haversine)."""
    db = get_database()
    
    # Get all online drivers with locations
    online_drivers = await db.drivers.find({"status": "online", "current_location": {"$ne": None}}).to_list(length=100)
    
    nearby_drivers = []
    for driver in online_drivers:
        d_loc = driver.get("current_location")
        dist = calculate_distance(lat, lng, d_loc["lat"], d_loc["lng"])
        
        if dist <= radius_km:
            nearby_drivers.append({
                "id": str(driver["_id"]),
                "driver_id": str(driver["_id"]),
                "vehicle_model": driver["vehicle_model"],
                "lat": d_loc["lat"],
                "lng": d_loc["lng"],
                "distance_km": round(dist, 2)
            })
            
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[API] GET /api/drivers/nearby: passenger_lat={lat}, passenger_lng={lng}, drivers_found={len(nearby_drivers)}")
            
    return nearby_drivers
