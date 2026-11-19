from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.auth import UserCreate, UserLogin, Token, UserResponse
from app.services.auth_service import get_password_hash, verify_password, create_access_token
from app.middleware.auth_middleware import get_current_user, require_passenger, require_driver
from app.database.mongodb import get_database

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    db = get_database()
    
    # Check for duplicate email
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Prepare user dict with hashed password
    user_dict = user_data.model_dump()
    user_dict["password_hash"] = get_password_hash(user_dict.pop("password"))
    user_dict["created_at"] = datetime.utcnow()
    
    # Insert into database
    result = await db.users.insert_one(user_dict)
    user_id = str(result.inserted_id)
    
    # Prepare response and token
    user_resp = UserResponse(id=user_id, name=user_dict["name"], email=user_dict["email"], role=user_dict["role"])
    token = create_access_token({"sub": user_id, "role": user_dict["role"]})
    
    return Token(access_token=token, token_type="bearer", user=user_resp)

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    db = get_database()
    
    # Find user by email
    user = await db.users.find_one({"email": user_data.email})
    
    # Verify user exists and password is correct
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    user_id = str(user["_id"])
    user_resp = UserResponse(id=user_id, name=user["name"], email=user["email"], role=user["role"])
    token = create_access_token({"sub": user_id, "role": user["role"]})
    
    return Token(access_token=token, token_type="bearer", user=user_resp)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"]
    )

# Test endpoints to verify role middleware (will be used by tests)
@router.get("/test-passenger")
async def test_passenger(current_user: dict = Depends(require_passenger)):
    return {"message": "You are a passenger"}

@router.get("/test-driver")
async def test_driver(current_user: dict = Depends(require_driver)):
    return {"message": "You are a driver"}
