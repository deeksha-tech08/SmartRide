from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from bson import ObjectId
from app.config import settings
from app.database.mongodb import get_database

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and verify the JWT token, then return the user from the database."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    db = get_database()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise credentials_exception
        
    if user is None:
        raise credentials_exception
    return user

async def require_passenger(current_user: dict = Depends(get_current_user)):
    """Dependency to ensure the current user is a passenger."""
    if current_user.get("role") != "passenger":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. Requires passenger role."
        )
    return current_user

async def require_driver(current_user: dict = Depends(get_current_user)):
    """Dependency to ensure the current user is a driver."""
    if current_user.get("role") != "driver":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted. Requires driver role."
        )
    return current_user
