#!/usr/bin/env python3
import errno
import hashlib
import json
import os
import stat
import sys

if len(sys.argv) != 3:
    raise SystemExit("usage: stage1-verify-tree.py ROOT MANIFEST")

root = os.path.realpath(sys.argv[1])
manifest_path = sys.argv[2]
if os.path.islink(sys.argv[1]) or root != os.path.abspath(sys.argv[1]):
    raise SystemExit("restore root identity mismatch")


def safe_relative(value: str) -> bool:
    if value == ".":
        return True
    if not value or value.startswith("/") or "\x00" in value:
        return False
    components = value.split("/")
    return all(component not in ("", ".", "..") for component in components) and os.path.normpath(value) == value


def read_xattrs(path: str) -> dict[str, str]:
    try:
        names = os.listxattr(path, follow_symlinks=False)
    except OSError as exc:
        if exc.errno in (errno.ENOTSUP, errno.EOPNOTSUPP):
            return {"__filesystem_support__": "unsupported"}
        raise
    result = {}
    for name in sorted(names):
        value = os.getxattr(path, name, follow_symlinks=False)
        result[name] = hashlib.sha256(value).hexdigest()
    return result


expected = {}
with open(manifest_path, encoding="utf-8") as manifest:
    for line in manifest:
        item = json.loads(line)
        relative = item.get("path")
        if not isinstance(relative, str) or not safe_relative(relative):
            raise SystemExit("unsafe manifest path")
        if relative in expected:
            raise SystemExit("duplicate manifest path")
        expected[relative] = item

actual_paths = set()
for base, dirs, files in os.walk(root, topdown=True, followlinks=False):
    dirs.sort()
    files.sort()
    relbase = os.path.relpath(base, root)
    relbase = "" if relbase == "." else relbase
    if relbase == "":
        actual_paths.add(".")
    for name in dirs + files:
        relative = "/".join(filter(None, [relbase, name]))
        if not safe_relative(relative):
            raise SystemExit("unsafe restored path")
        actual_paths.add(relative)

if actual_paths != set(expected):
    print(f"missing_paths={len(set(expected) - actual_paths)}")
    print(f"unexpected_paths={len(actual_paths - set(expected))}")
    raise SystemExit(1)

failures = []
for relative, wanted in expected.items():
    path = root if relative == "." else os.path.join(root, relative)
    info = os.lstat(path)
    kind = wanted.get("type")
    actual_kind = "file" if stat.S_ISREG(info.st_mode) else "dir" if stat.S_ISDIR(info.st_mode) else "symlink" if stat.S_ISLNK(info.st_mode) else "other"
    if actual_kind != kind:
        failures.append(relative + ":type")
        continue
    if format(stat.S_IMODE(info.st_mode), "04o") != wanted["mode"]:
        failures.append(relative + ":mode")
    if info.st_uid != wanted["uid"] or info.st_gid != wanted["gid"]:
        failures.append(relative + ":owner")
    if kind == "file":
        if info.st_nlink != 1:
            failures.append(relative + ":hardlink")
            continue
        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(path, flags)
        try:
            opened = os.fstat(descriptor)
            if not stat.S_ISREG(opened.st_mode) or (opened.st_dev, opened.st_ino) != (info.st_dev, info.st_ino):
                failures.append(relative + ":race")
                continue
            digest = hashlib.sha256()
            while True:
                chunk = os.read(descriptor, 1024 * 1024)
                if not chunk:
                    break
                digest.update(chunk)
        finally:
            os.close(descriptor)
        if digest.hexdigest() != wanted["sha256"]:
            failures.append(relative + ":sha256")
    elif kind == "symlink" and os.readlink(path) != wanted["link"]:
        failures.append(relative + ":link")
    if read_xattrs(path) != wanted.get("xattrs", {}):
        failures.append(relative + ":xattr_or_acl")

print(f"checked={len(expected)}")
print(f"failures={len(failures)}")
if failures:
    print("first_failure=" + failures[0])
    raise SystemExit(1)
