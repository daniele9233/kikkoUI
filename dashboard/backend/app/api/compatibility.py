from fastapi import APIRouter

from app.models.schemas import ComponentSelection, ValidationResult
from app.services.compatibility import get_matrix, validate

router = APIRouter()


@router.get("/matrix")
async def matrix():
    """Return the full compatibility matrix for frontend dropdowns."""
    return get_matrix()


@router.post("/validate", response_model=ValidationResult)
async def validate_selection(selection: ComponentSelection):
    """Validate a component selection before Ansible execution."""
    return validate(selection)
