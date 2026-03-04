from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.schemas import InventoryGroup, UserInfo
from app.services.inventory_service import (
    get_editable_vars,
    list_inventory_files,
    parse_inventory,
)

router = APIRouter()


@router.get("/files", response_model=list[str])
async def inventory_files(_: UserInfo = Depends(get_current_user)):
    return list_inventory_files()


@router.get("/parse", response_model=list[InventoryGroup])
async def parse(file: str = "inventory.ini", _: UserInfo = Depends(get_current_user)):
    return parse_inventory(file)


@router.get("/vars")
async def editable_vars(_: UserInfo = Depends(get_current_user)):
    return get_editable_vars()
