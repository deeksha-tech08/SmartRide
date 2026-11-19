from pydantic import BaseModel, EmailStr, Field
from typing import Literal

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Literal["passenger", "driver"]

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
