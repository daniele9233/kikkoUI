from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import ansible, auth, compatibility, history, inventory
from app.core.config import settings

app = FastAPI(
    title="KikkoUI DevOps Dashboard",
    version="1.0.0",
    description="Production-grade Ansible management dashboard for RKE2/Rancher",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(compatibility.router, prefix="/api/compatibility", tags=["compatibility"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(ansible.router, prefix="/api/ansible", tags=["ansible"])
app.include_router(history.router, prefix="/api/history", tags=["history"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
