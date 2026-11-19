import socketio
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Create the Socket.IO server with ASGI compatibility and CORS
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]
)

@sio.event
async def connect(sid, environ, auth):
    """Handle client connection."""
    logger.info(f"Socket connected: {sid}")
    # Connection authentication (JWT) will be fully implemented when needed.
    return True

@sio.event
async def disconnect(sid):
    """Handle client disconnection."""
    logger.info(f"Socket disconnected: {sid}")

@sio.event
async def ping_event(sid, data):
    """Simple ping-pong test event."""
    logger.info(f"Received ping from {sid} with data: {data}")
    await sio.emit('pong_event', {'message': 'pong', 'original_data': data}, to=sid)

from app.database.mongodb import get_database
from bson import ObjectId

@sio.on('driver:go_online')
async def driver_go_online(sid, data):
    """Event: driver:go_online"""
    logger.info(f"[Socket] driver:go_online received for driver {data.get('driver_id')}: {data}")
    driver_id = data.get("driver_id")
    lat = data.get("lat")
    lng = data.get("lng")
    
    if driver_id and lat and lng:
        db = get_database()
        await db.drivers.update_one(
            {"_id": ObjectId(driver_id)},
            {"$set": {"status": "online", "current_location": {"lat": lat, "lng": lng}}}
        )
        logger.info(f"[DB] driver location/status successfully updated to online for {driver_id}")
        # Broadcast to passengers
        await sio.emit('driver_location_update', {
            "driver_id": driver_id,
            "lat": lat,
            "lng": lng
        })

@sio.on('driver:location_update')
async def driver_location_update(sid, data):
    """Event: driver:location_update"""
    logger.info(f"[Socket] driver:location_update received: driver_id={data.get('driver_id')}, lat={data.get('lat')}, lng={data.get('lng')}")
    driver_id = data.get("driver_id")
    lat = data.get("lat")
    lng = data.get("lng")
    
    if driver_id and lat and lng:
        db = get_database()
        await db.drivers.update_one(
            {"_id": ObjectId(driver_id)},
            {"$set": {"current_location": {"lat": lat, "lng": lng}}}
        )
        logger.info(f"[DB] driver location successfully updated for {driver_id}")
        # Broadcast to passengers
        await sio.emit('driver_location_update', {
            "driver_id": driver_id,
            "lat": lat,
            "lng": lng
        })

@sio.on('driver:go_offline')
async def driver_go_offline(sid, data):
    """Event: driver:go_offline"""
    logger.info(f"[Socket] driver:go_offline received for driver {data.get('driver_id')}")
    driver_id = data.get("driver_id")
    
    if driver_id:
        db = get_database()
        await db.drivers.update_one(
            {"_id": ObjectId(driver_id)},
            {"$set": {"status": "offline"}}
        )
        logger.info(f"[DB] driver status successfully updated to offline for {driver_id}")
        # Broadcast offline status
        await sio.emit('driver_offline', {"driver_id": driver_id})
