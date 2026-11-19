"""MongoDB connection and database management using Motor async driver.

Motor is the official async Python driver for MongoDB. It wraps PyMongo
and makes all database operations non-blocking, which integrates perfectly
with FastAPI's async request handling.

This module provides:
- Async MongoDB client connection/disconnection
- Database and collection references
- Index creation for all collections
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger(__name__)

# Module-level references — initialized on app startup, used throughout the app
client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_to_mongodb() -> None:
    """Connect to MongoDB Atlas using Motor async driver.

    Called during FastAPI startup event. Creates the Motor client
    and stores references to the database and collections.
    """
    global client, db

    logger.info("Connecting to MongoDB Atlas...")

    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            maxPoolSize=10,
            minPoolSize=1,
            serverSelectionTimeoutMS=5000,
        )

        db = client[settings.DATABASE_NAME]

        # Verify connection by pinging the server
        await client.admin.command("ping")
        logger.info(
            "Connected to MongoDB Atlas — database: %s", settings.DATABASE_NAME
        )
    except Exception as e:
        logger.error("Failed to connect to MongoDB: %s", str(e))
        raise


async def close_mongodb_connection() -> None:
    """Close the MongoDB connection gracefully.

    Called during FastAPI shutdown event.
    """
    global client

    if client is not None:
        client.close()
        logger.info("MongoDB connection closed")


async def create_indexes() -> None:
    """Create database indexes for all collections.

    Indexes improve query performance for frequently accessed fields:
    - users.email: unique index for fast login lookups
    - drivers.user_id: unique index (one driver profile per user)
    - rides.passenger_id: index for ride history queries
    - rides.driver_id: index for ride history queries
    - rides.status: index for finding active rides
    """
    logger.info("Creating database indexes...")

    # Users collection — unique email for login
    await db.users.create_index("email", unique=True)

    # Drivers collection — one driver profile per user
    await db.drivers.create_index("user_id", unique=True)

    # Rides collection — efficient history and status queries
    await db.rides.create_index("passenger_id")
    await db.rides.create_index("driver_id")
    await db.rides.create_index("status")

    logger.info("Database indexes created successfully")


def get_database() -> AsyncIOMotorDatabase:
    """Get the database instance.

    Returns the Motor database reference for use in services.
    Must be called after connect_to_mongodb().
    """
    return db
