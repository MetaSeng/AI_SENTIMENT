"""
Helpers for downloading missing ML artifacts at runtime.

This allows cloud deployments to start even when large model files are not
tracked in git. Artifacts can be provided via:
1) per-file URL environment variables, or
2) MODEL_ARTIFACT_BASE_URL + relative artifact path.
"""

from __future__ import annotations

import logging
import os
import shutil
import tempfile
from pathlib import Path
from urllib import request

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _resolve_url(relative_path: str, env_key: str | None) -> str | None:
    if env_key:
        direct = os.getenv(env_key, "").strip()
        if direct:
            return direct

    base = os.getenv("MODEL_ARTIFACT_BASE_URL", "").strip()
    if not base:
        return None

    rel = relative_path.replace("\\", "/").lstrip("/")
    return f"{base.rstrip('/')}/{rel}"


def ensure_artifact(
    *,
    local_path: str,
    relative_path: str,
    env_key: str | None = None,
) -> bool:
    """
    Ensure a file exists locally. If missing, try downloading it from URL.
    Returns True if file exists/was downloaded, else False.
    """
    target = Path(local_path)
    if target.exists():
        return True

    url = _resolve_url(relative_path, env_key)
    if not url:
        return False

    target.parent.mkdir(parents=True, exist_ok=True)
    timeout = int(os.getenv("ARTIFACT_DOWNLOAD_TIMEOUT_SECONDS", "1800"))
    logger.info("Downloading artifact: %s", relative_path)
    logger.info("Source URL: %s", url)

    # Create temp file in the same directory as target to avoid cross-device
    # rename errors on platforms where /tmp and project dir are different mounts.
    tmp_fd, tmp_name = tempfile.mkstemp(
        prefix="artifact_",
        suffix=".tmp",
        dir=str(target.parent),
    )
    os.close(tmp_fd)

    try:
        with request.urlopen(url, timeout=timeout) as response, open(tmp_name, "wb") as out:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)

        try:
            os.replace(tmp_name, target)
        except OSError as exc:
            # Fallback to copy when atomic rename is not possible across devices.
            if getattr(exc, "errno", None) == 18:
                shutil.copyfile(tmp_name, target)
                os.remove(tmp_name)
            else:
                raise
        logger.info("Artifact ready: %s", target)
        return True
    except Exception as exc:
        logger.error("Failed to download artifact %s: %s", relative_path, exc)
        try:
            os.remove(tmp_name)
        except OSError:
            pass
        return False
