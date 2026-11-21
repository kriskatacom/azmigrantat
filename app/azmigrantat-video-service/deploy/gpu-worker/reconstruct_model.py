#!/usr/bin/env python3
"""Reconstruct and verify a chunked SwiftVR checkpoint on ephemeral storage."""

import argparse
import hashlib
import json
import os
from pathlib import Path


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chunks", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    chunks_root = args.chunks.resolve()
    output_root = args.output.resolve()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1:
        raise RuntimeError("Unsupported reconstruction manifest.")
    output_root.mkdir(parents=True, exist_ok=True, mode=0o700)

    for entry in manifest["files"]:
        relative = Path(entry["path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise RuntimeError("Unsafe reconstructed model path.")
        destination = output_root / relative
        destination.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        temporary = destination.with_name(destination.name + ".partial")
        with temporary.open("xb") as output_handle:
            for chunk in entry["chunks"]:
                source = (chunks_root / chunk["name"]).resolve()
                if chunks_root not in source.parents:
                    raise RuntimeError("Chunk path escaped its root.")
                if source.stat().st_size != int(chunk["size"]) or sha256(source) != chunk["sha256"]:
                    raise RuntimeError(f"Chunk verification failed: {chunk['name']}")
                with source.open("rb") as input_handle:
                    for block in iter(lambda: input_handle.read(8 * 1024 * 1024), b""):
                        output_handle.write(block)
            output_handle.flush()
            os.fsync(output_handle.fileno())
        if temporary.stat().st_size != int(entry["size"]) or sha256(temporary) != entry["sha256"]:
            temporary.unlink(missing_ok=True)
            raise RuntimeError(f"Reconstructed model verification failed: {relative}")
        os.replace(temporary, destination)
        destination.chmod(0o400)

    print(json.dumps({"ready": True, "checkpoint": str(output_root)}, separators=(",", ":")))


if __name__ == "__main__":
    main()
