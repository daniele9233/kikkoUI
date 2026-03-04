from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.schemas import UserInfo
from app.services.ansible_runner_service import list_runs

router = APIRouter()


@router.get("/runs")
async def runs(_: UserInfo = Depends(get_current_user)):
    return list_runs()
