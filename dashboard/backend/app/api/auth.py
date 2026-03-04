from fastapi import APIRouter, HTTPException, status, Depends

from app.core.security import USERS_DB, verify_password, create_access_token
from app.models.schemas import LoginRequest, TokenResponse, UserInfo
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = USERS_DB.get(body.username)
    if user is None or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")

    token = create_access_token({"sub": user["username"], "role": user["role"]})
    return TokenResponse(
        access_token=token,
        role=user["role"],
        display_name=user["display_name"],
    )


@router.get("/me", response_model=UserInfo)
async def me(user: UserInfo = Depends(get_current_user)):
    return user
