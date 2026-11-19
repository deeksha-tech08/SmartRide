"""FastAPI application entry point.

Creates the FastAPI app with CORS middleware, database lifecycle,
and health check endpoints. Socket.IO integration will be added in Module 5.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database.mongodb import connect_to_mongodb, close_mongodb_connection, create_indexes
from app.routers import auth, drivers, ai, rides

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Application lifespan — manages startup and shutdown tasks.

    Startup: Connect to MongoDB, create indexes.
    Shutdown: Close MongoDB connection gracefully.
    """
    # Startup
    await connect_to_mongodb()
    await create_indexes()
    logger.info("SmartRide API startup complete")
    yield
    # Shutdown
    await close_mongodb_connection()
    logger.info("SmartRide API shutdown complete")


# Create FastAPI application with lifespan
app = FastAPI(
    title="SmartRide API",
    description="Real-Time Ride Sharing & AI-Assisted Fare Estimation Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Include routers
app.include_router(auth.router)
app.include_router(drivers.router)
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(rides.router, prefix="/api/rides", tags=["Rides"])

# CORS configuration
allowed_origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint — API health check."""
    return {
        "message": "SmartRide API is running",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring."""
    return {"status": "healthy"}


from app.socket.events import sio
import socketio

# Socket.IO ASGI app — this is the entry point for uvicorn
socket_app = socketio.ASGIApp(sio, app)

logger.info("SmartRide API initialized — environment: %s", settings.ENVIRONMENT)
