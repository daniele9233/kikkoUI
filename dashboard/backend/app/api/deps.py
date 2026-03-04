"""Shared FastAPI dependencies (auth guards)."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import USERS_DB, decode_token
from app.models.schemas import UserInfo

_scheme = HTTPBearer()


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_scheme),
) -> UserInfo:
    payload = decode_token(creds.credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    username = payload.get("sub")
    user = USERS_DB.get(username)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return UserInfo(
        username=user["username"],
        role=user["role"],
        display_name=user["display_name"],
    )


async def require_admin(user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return user
