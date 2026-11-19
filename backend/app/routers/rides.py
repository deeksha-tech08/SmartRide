from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone
import logging
import pymongo
from pymongo import ReturnDocument

from app.database.mongodb import get_database
from app.middleware.auth_middleware import require_passenger, require_driver, get_current_user
from app.services.location_service import calculate_distance
from app.schemas.ride import RideRequest, RideResponse, RideStatusUpdateRequest
from app.socket.events import sio

router = APIRouter()
logger = logging.getLogger(__name__)

# Valid transitions map
VALID_TRANSITIONS = {
    "accepted": ["arriving"],
    "arriving": ["arrived"],
    "arrived": ["started"],
    "started": ["completed"]
}

@router.get("/history", response_model=list[RideResponse])
async def get_ride_history(user: dict = Depends(get_current_user)):
    db = get_database()
    query = {"status": "completed"}
    
    if user["role"] == "passenger":
        query["passenger_id"] = user["_id"]
    elif user["role"] == "driver":
        driver_profile = await db.drivers.find_one({"user_id": user["_id"]})
        if not driver_profile:
            return []
        query["driver_id"] = driver_profile["_id"]
    else:
        raise HTTPException(status_code=403, detail="Invalid role")
        
    cursor = db.rides.find(query).sort("created_at", pymongo.DESCENDING)
    rides = await cursor.to_list(length=100)
    
    result = []
    for r in rides:
        result.append(RideResponse(
            id=str(r["_id"]),
            passenger_id=str(r["passenger_id"]),
            driver_id=str(r["driver_id"]) if r.get("driver_id") else None,
            pickup=r["pickup"],
            destination=r["destination"],
            status=r["status"],
            distance_km=r["distance_km"],
            fare=r["fare"],
            created_at=r["created_at"],
            updated_at=r["updated_at"]
        ))
    return result

@router.post("/request", response_model=RideResponse)
async def request_ride(req: RideRequest, passenger: dict = Depends(require_passenger)):
    db = get_database()
    
    dist = calculate_distance(req.pickup_lat, req.pickup_lng, req.dest_lat, req.dest_lng)
    distance_km = round(dist, 2)
    fare = round(50.0 + (distance_km * 12.0))
    
    now = datetime.now(timezone.utc)
    ride_doc = {
        "passenger_id": passenger["_id"],
        "driver_id": None,
        "pickup": {"lat": req.pickup_lat, "lng": req.pickup_lng},
        "destination": {"lat": req.dest_lat, "lng": req.dest_lng},
        "status": "requested",
        "distance_km": distance_km,
        "fare": fare,
        "created_at": now,
        "updated_at": now
    }
    
    result = await db.rides.insert_one(ride_doc)
    ride_doc["_id"] = result.inserted_id
    
    response = RideResponse(
        id=str(ride_doc["_id"]),
        passenger_id=str(ride_doc["passenger_id"]),
        driver_id=None,
        pickup=ride_doc["pickup"],
        destination=ride_doc["destination"],
        status=ride_doc["status"],
        distance_km=ride_doc["distance_km"],
        fare=ride_doc["fare"],
        created_at=ride_doc["created_at"],
        updated_at=ride_doc["updated_at"]
    )
    
    # Broadcast to all online drivers
    await sio.emit("new_ride_request", response.model_dump(mode='json'))
    return response

@router.post("/{ride_id}/accept", response_model=RideResponse)
async def accept_ride(ride_id: str, driver: dict = Depends(require_driver)):
    db = get_database()
    
    # Ensure driver is online
    driver_profile = await db.drivers.find_one({"user_id": driver["_id"]})
    if not driver_profile or driver_profile.get("status") != "online":
        raise HTTPException(status_code=400, detail="Driver must be online to accept a ride")
        
    # Atomic find and update
    from pymongo import ReturnDocument
    now = datetime.now(timezone.utc)
    updated_ride = await db.rides.find_one_and_update(
        {"_id": ObjectId(ride_id), "status": "requested"},
        {"$set": {
            "status": "accepted",
            "driver_id": driver_profile["_id"],
            "updated_at": now
        }},
        return_document=ReturnDocument.AFTER
    )
    
    if not updated_ride:
        raise HTTPException(status_code=400, detail="Ride no longer available or already accepted")
        
    response = RideResponse(
        id=str(updated_ride["_id"]),
        passenger_id=str(updated_ride["passenger_id"]),
        driver_id=str(updated_ride["driver_id"]),
        pickup=updated_ride["pickup"],
        destination=updated_ride["destination"],
        status=updated_ride["status"],
        distance_km=updated_ride["distance_km"],
        fare=updated_ride["fare"],
        created_at=updated_ride["created_at"],
        updated_at=updated_ride["updated_at"]
    )
    
    # Broadcast acceptance to passenger
    await sio.emit("ride_accepted", response.model_dump(mode='json'))
    return response

@router.post("/{ride_id}/status", response_model=RideResponse)
async def update_ride_status(ride_id: str, req: RideStatusUpdateRequest, driver: dict = Depends(require_driver)):
    db = get_database()
    
    driver_profile = await db.drivers.find_one({"user_id": driver["_id"]})
    if not driver_profile or driver_profile.get("status") == "offline":
        raise HTTPException(status_code=400, detail="Driver must be online to update ride")
        
    ride = await db.rides.find_one({"_id": ObjectId(ride_id)})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
        
    if str(ride.get("driver_id")) != str(driver_profile["_id"]):
        raise HTTPException(status_code=403, detail="Not assigned to this ride")
        
    current_status = ride["status"]
    new_status = req.status
    
    # Strict validation
    if current_status not in VALID_TRANSITIONS or new_status not in VALID_TRANSITIONS[current_status]:
        raise HTTPException(status_code=400, detail=f"Invalid transition from {current_status} to {new_status}")
        
    now = datetime.now(timezone.utc)
    updated_ride = await db.rides.find_one_and_update(
        {"_id": ObjectId(ride_id)},
        {"$set": {"status": new_status, "updated_at": now}},
        return_document=ReturnDocument.AFTER
    )
    
    response = RideResponse(
        id=str(updated_ride["_id"]),
        passenger_id=str(updated_ride["passenger_id"]),
        driver_id=str(updated_ride["driver_id"]),
        pickup=updated_ride["pickup"],
        destination=updated_ride["destination"],
        status=updated_ride["status"],
        distance_km=updated_ride["distance_km"],
        fare=updated_ride["fare"],
        created_at=updated_ride["created_at"],
        updated_at=updated_ride["updated_at"]
    )
    
    await sio.emit("ride_status_update", response.model_dump(mode='json'))
    return response
