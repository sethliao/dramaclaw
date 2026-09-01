"""Configuration backup / restore — export & import CE runtime settings.

The whole runtime configuration lives in the CE-local ``runtime_settings``
table (gateway mode, base URL, API key, media relay, channels, ...). These
endpoints let the frontend download the bundle as JSON and re-apply it, so a
fresh install or a second machine can be restored in one step.

Exported keys are returned exactly as stored — secrets that were masked at
rest (``**********``) stay masked and cannot be recovered.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from novelvideo import model_gateway_settings

router = APIRouter()

BACKUP_FORMAT_VERSION = 1
_MAX_IMPORT_KEYS = 1000


@router.get("/config-backup/export")
async def export_config_backup() -> JSONResponse:
    settings = model_gateway_settings.export_runtime_settings()
    return JSONResponse(
        {
            "ok": True,
            "data": {
                "format_version": BACKUP_FORMAT_VERSION,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "settings": settings,
            },
        }
    )


@router.post("/config-backup/import")
async def import_config_backup(payload: dict[str, Any]) -> JSONResponse:
    if not isinstance(payload, dict):
        return JSONResponse(
            {"ok": False, "error": "Request body must be a JSON object."},
            status_code=400,
        )
    values = payload.get("settings")
    if not isinstance(values, dict):
        return JSONResponse(
            {"ok": False, "error": "Field 'settings' must be an object."},
            status_code=400,
        )
    if len(values) > _MAX_IMPORT_KEYS:
        return JSONResponse(
            {
                "ok": False,
                "error": f"Too many settings keys (max {_MAX_IMPORT_KEYS}).",
            },
            status_code=400,
        )
    try:
        new_state = model_gateway_settings.import_runtime_settings(values)
    except Exception as exc:  # pragma: no cover - defensive
        return JSONResponse(
            {"ok": False, "error": f"Failed to import settings: {exc}"},
            status_code=500,
        )
    return JSONResponse(
        {
            "ok": True,
            "data": {
                "format_version": BACKUP_FORMAT_VERSION,
                "imported_keys": len(values),
                "settings": new_state,
            },
        }
    )
