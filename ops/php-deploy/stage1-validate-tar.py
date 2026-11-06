#!/usr/bin/env python3
import os
import posixpath
import sys
import tarfile

if len(sys.argv) != 2:
    raise SystemExit("usage: stage1-validate-tar.py EXPECTED_TOP_LEVEL")

top = sys.argv[1]
if not top or "/" in top or top in (".", ".."):
    raise SystemExit("invalid expected top-level directory")


def safe_name(value: str) -> bool:
    if not value or value.startswith("/") or "\x00" in value:
        return False
    normalized = posixpath.normpath(value)
    if normalized != value.rstrip("/") or normalized == ".." or normalized.startswith("../"):
        return False
    return normalized == top or normalized.startswith(top + "/")


count = 0
seen = set()
with tarfile.open(fileobj=sys.stdin.buffer, mode="r|*") as archive:
    for member in archive:
        name = member.name.rstrip("/")
        if not safe_name(name):
            raise SystemExit("unsafe archive member path")
        if name in seen:
            raise SystemExit("duplicate archive member path")
        seen.add(name)
        if not (member.isfile() or member.isdir() or member.issym()):
            raise SystemExit("unsupported archive member type")
        if member.islnk():
            raise SystemExit("hard link is not allowed")
        if member.issym():
            link = member.linkname
            if not link or link.startswith("/"):
                raise SystemExit("unsafe symlink target")
            resolved = posixpath.normpath(posixpath.join(posixpath.dirname(name), link))
            if not safe_name(resolved):
                raise SystemExit("escaping symlink target")
        count += 1

if top not in seen:
    raise SystemExit("expected top-level directory is absent")
print(f"archive_members={count}")
print("archive_paths=safe")
