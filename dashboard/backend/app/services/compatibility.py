"""
Compatibility validation engine.

Sources:
  - https://www.suse.com/suse-rancher/support-matrix/all-supported-versions/
  - RKE2 / Rancher release notes

The matrix below is a curated snapshot.  The /api/compatibility/matrix endpoint
exposes it so the frontend can render dropdowns dynamically, and the
validate() function enforces constraints *before* Ansible runs.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.core.config import settings
from app.models.schemas import ComponentSelection, ValidationResult

MATRIX_FILE = Path(settings.data_dir) / "compatibility_matrix.json"


def _load_matrix() -> dict:
    with open(MATRIX_FILE) as f:
        return json.load(f)


def get_matrix() -> dict:
    return _load_matrix()


def validate(selection: ComponentSelection) -> ValidationResult:
    matrix = _load_matrix()
    errors: list[str] = []
    warnings: list[str] = []

    # 1. Check Rancher version exists in matrix
    rancher_entry = None
    for entry in matrix["rancher_versions"]:
        if entry["version"] == selection.rancher_version:
            rancher_entry = entry
            break

    if rancher_entry is None:
        errors.append(
            f"Rancher version {selection.rancher_version} is not in the supported matrix. "
            f"Supported: {[e['version'] for e in matrix['rancher_versions']]}"
        )
        return ValidationResult(valid=False, errors=errors, warnings=warnings)

    # 2. Check RKE2 version is compatible with selected Rancher
    if selection.rke2_version not in rancher_entry["compatible_rke2"]:
        errors.append(
            f"RKE2 {selection.rke2_version} is not compatible with Rancher {selection.rancher_version}. "
            f"Compatible RKE2 versions: {rancher_entry['compatible_rke2']}"
        )

    # 3. Check CNI is supported for this RKE2 version
    rke2_entry = None
    for entry in matrix["rke2_versions"]:
        if entry["version"] == selection.rke2_version:
            rke2_entry = entry
            break

    if rke2_entry is None:
        errors.append(
            f"RKE2 version {selection.rke2_version} is not in the supported matrix."
        )
    elif selection.cni not in rke2_entry["supported_cni"]:
        errors.append(
            f"CNI '{selection.cni}' is not supported with RKE2 {selection.rke2_version}. "
            f"Supported: {rke2_entry['supported_cni']}"
        )

    # 4. Ingress / CNI conflict checks
    ingress_cni_conflicts = matrix.get("ingress_cni_conflicts", {})
    conflict_key = f"{selection.ingress}+{selection.cni}"
    if conflict_key in ingress_cni_conflicts:
        errors.append(ingress_cni_conflicts[conflict_key])

    # 5. Warnings for non-default combos
    if selection.cni == "cilium" and selection.ingress == "nginx-ingress":
        warnings.append(
            "Cilium with nginx-ingress requires kube-proxy replacement to be disabled. "
            "Ensure your RKE2 config has 'disable-kube-proxy: false'."
        )

    if selection.cni == "canal":
        warnings.append(
            "Canal is the default RKE2 CNI. Consider Cilium for advanced observability."
        )

    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
    )
