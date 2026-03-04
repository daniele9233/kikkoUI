"""
Parse Ansible INI-style inventory files and expose them via the API.
Also supports editing group_vars/all.yml.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from app.core.config import settings
from app.models.schemas import InventoryGroup, InventoryHost


def _inventory_path(filename: str = "inventory.ini") -> Path:
    return Path(settings.ansible_project_dir) / filename


def list_inventory_files() -> list[str]:
    root = Path(settings.ansible_project_dir)
    files = []
    for f in root.glob("*.ini"):
        files.append(f.name)
    for f in root.glob("inventory/*.yml"):
        files.append(f"inventory/{f.name}")
    for f in root.glob("inventory/*.yaml"):
        files.append(f"inventory/{f.name}")
    return files


def parse_inventory(filename: str = "inventory.ini") -> list[InventoryGroup]:
    path = _inventory_path(filename)
    if not path.exists():
        return []

    groups: dict[str, list[InventoryHost]] = {}
    current_group = "ungrouped"

    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith(";"):
            continue

        group_match = re.match(r"^\[([^\]]+)\]", line)
        if group_match:
            current_group = group_match.group(1)
            if current_group not in groups:
                groups[current_group] = []
            continue

        # Parse host line
        parts = line.split()
        if not parts:
            continue

        hostname = parts[0]
        attrs: dict[str, str] = {}
        for part in parts[1:]:
            if "=" in part:
                k, v = part.split("=", 1)
                attrs[k] = v

        host = InventoryHost(
            name=hostname,
            ansible_host=attrs.get("ansible_host", hostname),
            ansible_user=attrs.get("ansible_user", "root"),
            groups=[current_group],
        )

        if current_group not in groups:
            groups[current_group] = []
        groups[current_group].append(host)

    return [
        InventoryGroup(name=name, hosts=hosts)
        for name, hosts in groups.items()
    ]


def get_group_vars() -> dict:
    gv_path = Path(settings.ansible_project_dir) / "group_vars" / "all.yml"
    if not gv_path.exists():
        return {}
    with open(gv_path) as f:
        return yaml.safe_load(f) or {}


def get_editable_vars() -> dict:
    """Return the subset of group_vars that users can safely edit from the UI."""
    all_vars = get_group_vars()
    editable_keys = [
        "rancher_domain",
        "helm_version",
        "rancher_version",
        "cluster_name",
        "cluster_k8s_version",
        "cluster_cni",
        "traefik_namespace",
        "traefik_service_type",
        "traefik_replicas",
        "prometheus_namespace",
        "grafana_password",
        "prometheus_retention",
        "prometheus_storage_size",
        "grafana_storage_size",
        "storage_class_name",
        "nginx_worker_processes",
    ]
    return {k: v for k, v in all_vars.items() if k in editable_keys}
