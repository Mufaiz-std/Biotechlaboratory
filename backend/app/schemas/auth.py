from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    phone: str = Field(min_length=10)
    password: str = Field(min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    name: str
    phone: str
    is_active: bool

    model_config = {"from_attributes": True}


class ProfileUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(min_length=10, max_length=20)
