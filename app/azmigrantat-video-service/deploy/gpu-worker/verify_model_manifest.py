#!/usr/bin/env python3
"""Fail-closed verification for a locally mounted SwiftVR checkpoint."""

import argparse
import hashlib
import json
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify(manifest_path: Path, checkpoint: Path, commercial: bool) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1 or not isinstance(manifest.get("files"), list):
        raise RuntimeError("Unsupported model manifest.")
    if commercial and (
        manifest.get("commercial_authorization_required") is True
        and manifest.get("commercial_authorization_approved") is not True
    ):
        raise RuntimeError("The pinned SwiftVR weights are not approved for commercial/customer processing.")
    verified = []
    root = checkpoint.resolve()
    for entry in manifest["files"]:
        relative = Path(entry["path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise RuntimeError("Unsafe model manifest path.")
        path = (root / relative).resolve()
        if root not in path.parents:
            raise RuntimeError("Model file escapes checkpoint directory.")
        actual_size = path.stat().st_size
        if actual_size != int(entry["size"]):
            raise RuntimeError(f"Model size mismatch: {relative}")
        actual_sha256 = sha256(path)
        if actual_sha256 != entry["sha256"]:
            raise RuntimeError(f"Model checksum mismatch: {relative}")
        verified.append(str(relative))
    return {
        "ready": True,
        "model_id": manifest["model_id"],
        "model_revision": manifest["model_revision"],
        "commercial_mode": commercial,
        "verified_files": verified,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--commercial", action="store_true")
    args = parser.parse_args()
    print(json.dumps(verify(args.manifest, args.checkpoint, args.commercial), separators=(",", ":")))


if __name__ == "__main__":
    main()
