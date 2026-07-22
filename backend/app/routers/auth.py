from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.response import error_response, success_response
from app.models.user import User
from app.schemas.auth import LoginRequest, ProfileUpdateRequest, TokenResponse, UserResponse
from app.services.auth_service import AuthError, authenticate_user
from app.services.booking_service import BookingError, update_profile

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        user, token = authenticate_user(db, payload)
        return success_response(
            "Login successful",
            {
                "access_token": token,
                "token_type": "bearer",
                "user": UserResponse.model_validate(user).model_dump(),
            },
        )
    except AuthError as exc:
        return error_response(str(exc), status_code=401)


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return success_response("Profile fetched", UserResponse.model_validate(current_user).model_dump())


@router.put("/profile")
def update_user_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        user = update_profile(db, current_user, payload)
        return success_response("Profile updated", UserResponse.model_validate(user).model_dump())
    except BookingError as exc:
        return error_response(str(exc))
