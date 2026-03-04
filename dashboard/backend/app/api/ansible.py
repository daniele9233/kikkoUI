from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse, StreamingResponse

from app.api.deps import get_current_user, require_admin
from app.models.schemas import AnsibleRunRequest, AnsibleRunStatus, UserInfo
from app.services.ansible_runner_service import (
    cancel_run,
    get_log,
    get_log_path,
    get_status,
    start_run,
)
from app.services.compatibility import validate

router = APIRouter()


@router.post("/run", response_model=AnsibleRunStatus)
async def run_playbook(
    req: AnsibleRunRequest,
    user: UserInfo = Depends(require_admin),
):
    """Start an Ansible playbook execution (admin only)."""
    # Pre-flight validation
    result = validate(req.components)
    if not result.valid:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Component selection has compatibility errors",
                "errors": result.errors,
            },
        )

    run_id = start_run(req)
    return get_status(run_id)


@router.get("/status/{run_id}", response_model=AnsibleRunStatus)
async def run_status(run_id: str, _: UserInfo = Depends(get_current_user)):
    s = get_status(run_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Run not found")
    return s


@router.get("/log/{run_id}")
async def run_log(run_id: str, _: UserInfo = Depends(get_current_user)):
    log = get_log(run_id)
    if log is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Log not found")
    return PlainTextResponse(log)


@router.get("/log/{run_id}/download")
async def download_log(run_id: str, _: UserInfo = Depends(get_current_user)):
    path = get_log_path(run_id)
    if path is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Log not found")

    def iterfile():
        with open(path, "rb") as f:
            yield from f

    return StreamingResponse(
        iterfile(),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={run_id}.log"},
    )


@router.post("/cancel/{run_id}")
async def cancel(run_id: str, _: UserInfo = Depends(require_admin)):
    if cancel_run(run_id):
        return {"message": "Run cancelled"}
    raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot cancel this run")
