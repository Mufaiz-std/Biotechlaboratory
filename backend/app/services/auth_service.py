from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import LoginRequest


class AuthError(Exception):
    pass


def authenticate_user(db: Session, payload: LoginRequest) -> tuple[User, str]:
    settings = get_settings()
    matched_name = None

    if payload.phone == settings.admin_1_phone and payload.password == settings.admin_1_password:
        matched_name = settings.admin_1_name
    elif payload.phone == settings.admin_2_phone and payload.password == settings.admin_2_password:
        matched_name = settings.admin_2_name

    if not matched_name:
        raise AuthError("Invalid phone number or password")

    user = db.query(User).filter(User.phone == payload.phone).first()
    if not user:
        user = User(
            username=payload.phone,
            phone=payload.phone,
            name=matched_name,
            password_hash="ENV_MANAGED"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise AuthError("Account is inactive")

    token = create_access_token(str(user.id))
    return user, token
