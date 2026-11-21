#!/usr/bin/env python3
"""Prepare deterministic sub-10-GiB SwiftVR weight layers for GHCR.

The output directory is intentionally outside Git. Each large model file is
split into fixed 4-GiB chunks; the reconstruction manifest records both chunk
and final-file checksums.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path

CHUNK_BYTES = 4 * 1024 * 1024 * 1024


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", required=True, type=Path)
    parser.add_argument("--model-manifest", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    source_root = args.models.resolve()
    output = args.output.resolve()
    if output == source_root or source_root in output.parents:
        raise RuntimeError("Output must not be inside the source model directory.")
    output.mkdir(parents=True, exist_ok=False, mode=0o700)
    manifest = json.loads(args.model_manifest.read_text(encoding="utf-8"))
    reconstruction = {"schema_version": 1, "chunk_bytes": CHUNK_BYTES, "files": []}

    for entry in manifest["files"]:
        relative = Path(entry["path"])
        source = (source_root / relative).resolve()
        if source_root not in source.parents or source.stat().st_size != int(entry["size"]):
            raise RuntimeError(f"Unsafe path or size mismatch: {relative}")
        if sha256(source) != entry["sha256"]:
            raise RuntimeError(f"Checksum mismatch: {relative}")
        chunks = []
        with source.open("rb") as input_handle:
            index = 0
            while True:
                data = input_handle.read(CHUNK_BYTES)
                if not data:
                    break
                name = f"file-{len(reconstruction['files']):02d}-part-{index:03d}"
                destination = output / name
                with destination.open("xb") as output_handle:
                    output_handle.write(data)
                    output_handle.flush()
                    os.fsync(output_handle.fileno())
                destination.chmod(0o400)
                chunks.append({"name": name, "size": len(data), "sha256": sha256(destination)})
                index += 1
        reconstruction["files"].append({
            "path": str(relative), "size": int(entry["size"]),
            "sha256": entry["sha256"], "chunks": chunks,
        })

    manifest_path = output / "reconstruction-manifest.json"
    manifest_path.write_text(json.dumps(reconstruction, indent=2) + "\n", encoding="utf-8")
    manifest_path.chmod(0o400)
    print(json.dumps({"ready": True, "output": str(output), "files": reconstruction["files"]}, separators=(",", ":")))


if __name__ == "__main__":
    main()
