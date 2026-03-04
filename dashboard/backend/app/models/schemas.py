from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    display_name: str


class UserInfo(BaseModel):
    username: str
    role: str
    display_name: str


# --- Compatibility ---
class ComponentSelection(BaseModel):
    ingress: str = Field(..., pattern=r"^(nginx-ingress|traefik)$")
    cni: str = Field(..., pattern=r"^(calico|canal|cilium)$")
    rancher_version: str
    rke2_version: str


class ValidationResult(BaseModel):
    valid: bool
    errors: list[str] = []
    warnings: list[str] = []


# --- Ansible execution ---
class ExecutionMode(str, Enum):
    run = "run"
    check = "check"
    diff = "diff"
    check_diff = "check_diff"


class AnsibleRunRequest(BaseModel):
    components: ComponentSelection
    execution_mode: ExecutionMode = ExecutionMode.run
    inventory_file: str = "inventory.ini"
    extra_vars: dict[str, str] = {}
    tags: list[str] = []
    limit: str | None = None


class AnsibleRunStatus(BaseModel):
    run_id: str
    status: str  # queued | running | completed | failed | cancelled
    started_at: datetime | None = None
    finished_at: datetime | None = None
    execution_mode: str
    rc: int | None = None
    stats: dict | None = None


# --- Inventory ---
class InventoryHost(BaseModel):
    name: str
    ansible_host: str
    ansible_user: str
    groups: list[str]


class InventoryGroup(BaseModel):
    name: str
    hosts: list[InventoryHost]


# --- History ---
class HistoryEntry(BaseModel):
    run_id: str
    status: str
    started_at: datetime | None
    finished_at: datetime | None
    execution_mode: str
    components: ComponentSelection
    rc: int | None = None
    stats: dict | None = None
