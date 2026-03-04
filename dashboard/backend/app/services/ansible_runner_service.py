"""
Wraps the existing Ansible playbook execution via subprocess.

Key design choices
------------------
* subprocess (not ansible-runner library directly) keeps us compatible with
  any Ansible version already installed in the host / container.
* Each run gets a unique UUID stored in HISTORY_DIR so we can stream logs and
  replay results.
* Real-time stdout is written line-by-line to a log file that the WebSocket
  endpoint tails.
"""

from __future__ import annotations

import json
import os
import subprocess
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.models.schemas import AnsibleRunRequest, AnsibleRunStatus, ExecutionMode

# In-memory registry of active / recent runs
_runs: dict[str, dict] = {}
_lock = threading.Lock()


def _history_dir() -> Path:
    p = Path(settings.history_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


def _build_command(req: AnsibleRunRequest, run_id: str) -> list[str]:
    cmd = [
        "ansible-playbook",
        "site.yml",
        "-i", req.inventory_file,
    ]

    if req.execution_mode == ExecutionMode.check:
        cmd.append("--check")
    elif req.execution_mode == ExecutionMode.diff:
        cmd.append("--diff")
    elif req.execution_mode == ExecutionMode.check_diff:
        cmd.extend(["--check", "--diff"])

    # Merge user-selected components into extra-vars
    merged_vars = {
        "cluster_cni": req.components.cni,
        "rancher_version": req.components.rancher_version,
        "cluster_k8s_version": req.components.rke2_version,
    }
    merged_vars.update(req.extra_vars)

    for k, v in merged_vars.items():
        cmd.extend(["-e", f"{k}={v}"])

    if req.tags:
        cmd.extend(["--tags", ",".join(req.tags)])

    if req.limit:
        cmd.extend(["--limit", req.limit])

    return cmd


def _run_playbook(run_id: str, req: AnsibleRunRequest) -> None:
    """Executed in a background thread."""
    hdir = _history_dir()
    log_path = hdir / f"{run_id}.log"
    meta_path = hdir / f"{run_id}.json"

    cmd = _build_command(req, run_id)

    with _lock:
        _runs[run_id]["status"] = "running"
        _runs[run_id]["started_at"] = datetime.now(timezone.utc).isoformat()

    env = os.environ.copy()
    env["ANSIBLE_FORCE_COLOR"] = "true"
    env["ANSIBLE_STDOUT_CALLBACK"] = "default"

    try:
        with open(log_path, "w") as log_fh:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                cwd=settings.ansible_project_dir,
                env=env,
                text=True,
                bufsize=1,
            )
            with _lock:
                _runs[run_id]["pid"] = proc.pid

            for line in proc.stdout:  # type: ignore[union-attr]
                log_fh.write(line)
                log_fh.flush()

            proc.wait()

        finished = datetime.now(timezone.utc).isoformat()
        status = "completed" if proc.returncode == 0 else "failed"

        with _lock:
            _runs[run_id].update(
                status=status,
                finished_at=finished,
                rc=proc.returncode,
            )

        # Persist metadata
        meta = {
            "run_id": run_id,
            "status": status,
            "started_at": _runs[run_id]["started_at"],
            "finished_at": finished,
            "execution_mode": req.execution_mode.value,
            "components": req.components.model_dump(),
            "rc": proc.returncode,
            "command": cmd,
        }
        with open(meta_path, "w") as f:
            json.dump(meta, f, indent=2)

    except Exception as exc:
        with _lock:
            _runs[run_id].update(
                status="failed",
                finished_at=datetime.now(timezone.utc).isoformat(),
                error=str(exc),
            )


def start_run(req: AnsibleRunRequest) -> str:
    run_id = str(uuid.uuid4())[:12]
    with _lock:
        _runs[run_id] = {
            "run_id": run_id,
            "status": "queued",
            "started_at": None,
            "finished_at": None,
            "execution_mode": req.execution_mode.value,
            "rc": None,
            "pid": None,
        }

    t = threading.Thread(target=_run_playbook, args=(run_id, req), daemon=True)
    t.start()
    return run_id


def get_status(run_id: str) -> AnsibleRunStatus | None:
    with _lock:
        info = _runs.get(run_id)
    if info is None:
        # Try loading from history
        meta_path = _history_dir() / f"{run_id}.json"
        if meta_path.exists():
            with open(meta_path) as f:
                info = json.load(f)
        else:
            return None

    return AnsibleRunStatus(
        run_id=info["run_id"],
        status=info["status"],
        started_at=info.get("started_at"),
        finished_at=info.get("finished_at"),
        execution_mode=info.get("execution_mode", "run"),
        rc=info.get("rc"),
        stats=info.get("stats"),
    )


def get_log(run_id: str) -> str | None:
    log_path = _history_dir() / f"{run_id}.log"
    if log_path.exists():
        return log_path.read_text()
    return None


def get_log_path(run_id: str) -> Path | None:
    log_path = _history_dir() / f"{run_id}.log"
    return log_path if log_path.exists() else None


def cancel_run(run_id: str) -> bool:
    import signal

    with _lock:
        info = _runs.get(run_id)
    if info and info.get("pid") and info["status"] == "running":
        try:
            os.kill(info["pid"], signal.SIGTERM)
            with _lock:
                _runs[run_id]["status"] = "cancelled"
                _runs[run_id]["finished_at"] = datetime.now(timezone.utc).isoformat()
            return True
        except ProcessLookupError:
            pass
    return False


def list_runs() -> list[dict]:
    """Return all runs (in-memory + persisted)."""
    result = {}

    # Load from disk
    for meta_file in sorted(_history_dir().glob("*.json"), reverse=True):
        with open(meta_file) as f:
            data = json.load(f)
            result[data["run_id"]] = data

    # Overlay in-memory (more up-to-date)
    with _lock:
        for rid, info in _runs.items():
            result[rid] = info

    return sorted(result.values(), key=lambda x: x.get("started_at") or "", reverse=True)
