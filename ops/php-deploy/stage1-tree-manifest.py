#!/usr/bin/env python3
import errno
import hashlib
import json
import os
import stat
import sys

if len(sys.argv) < 3:
    raise SystemExit("usage: stage1-tree-manifest.py ROOT OUTPUT [EXCLUDED_RELATIVE_PATH ...]")

root = os.path.realpath(sys.argv[1])
output = sys.argv[2]
excluded = set(sys.argv[3:])
if os.path.islink(sys.argv[1]) or root != os.path.abspath(sys.argv[1]):
    raise SystemExit("root must be an exact non-symlink path")


def skipped(relative: str) -> bool:
    return any(relative == item or relative.startswith(item + "/") for item in excluded)


def xattrs(path: str) -> dict[str, str]:
    try:
        names = os.listxattr(path, follow_symlinks=False)
    except OSError as exc:
        if exc.errno in (errno.ENOTSUP, errno.EOPNOTSUPP):
            return {"__filesystem_support__": "unsupported"}
        raise
    result = {}
    for name in sorted(names):
        try:
            value = os.getxattr(path, name, follow_symlinks=False)
        except OSError as exc:
            if exc.errno in (errno.ENOTSUP, errno.EOPNOTSUPP):
                raise RuntimeError("xattr support changed during inventory") from exc
            raise
        result[name] = hashlib.sha256(value).hexdigest()
    return result


items = []
for base, dirs, files in os.walk(root, topdown=True, followlinks=False):
    relbase = os.path.relpath(base, root)
    relbase = "" if relbase == "." else relbase
    dirs[:] = sorted(d for d in dirs if not skipped("/".join(filter(None, [relbase, d]))))
    names = ([""] if relbase == "" else []) + sorted(dirs) + sorted(files)
    for name in names:
        path = root if name == "" else os.path.join(base, name)
        relative = "." if name == "" else os.path.relpath(path, root)
        if relative != "." and skipped(relative):
            continue
        info = os.lstat(path)
        item = {
            "path": relative,
            "mode": format(stat.S_IMODE(info.st_mode), "04o"),
            "uid": info.st_uid,
            "gid": info.st_gid,
            "size": info.st_size,
            "xattrs": xattrs(path),
        }
        if stat.S_ISREG(info.st_mode):
            if info.st_nlink != 1:
                raise SystemExit(f"hard-linked file is not allowed: {relative}")
            flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
            descriptor = os.open(path, flags)
            try:
                opened = os.fstat(descriptor)
                if not stat.S_ISREG(opened.st_mode) or (opened.st_dev, opened.st_ino) != (info.st_dev, info.st_ino):
                    raise RuntimeError(f"file changed during inventory: {relative}")
                digest = hashlib.sha256()
                while True:
                    chunk = os.read(descriptor, 1024 * 1024)
                    if not chunk:
                        break
                    digest.update(chunk)
            finally:
                os.close(descriptor)
            item.update(type="file", sha256=digest.hexdigest())
        elif stat.S_ISDIR(info.st_mode):
            item["type"] = "dir"
        elif stat.S_ISLNK(info.st_mode):
            target = os.readlink(path)
            if os.path.isabs(target):
                raise SystemExit(f"absolute symlink is not allowed: {relative}")
            resolved = os.path.realpath(os.path.join(os.path.dirname(path), target))
            if os.path.commonpath([root, resolved]) != root:
                raise SystemExit(f"escaping symlink is not allowed: {relative}")
            item.update(type="symlink", link=target)
        else:
            raise SystemExit(f"special filesystem node is not allowed: {relative}")
        items.append(item)

paths = [item["path"] for item in items]
if len(paths) != len(set(paths)):
    raise SystemExit("duplicate path generated")
with open(output, "w", encoding="utf-8") as target:
    for item in sorted(items, key=lambda value: value["path"]):
        target.write(json.dumps(item, sort_keys=True, separators=(",", ":")) + "\n")
print(f"entries={len(items)}")
print(f"regular_file_bytes={sum(item['size'] for item in items if item['type'] == 'file')}")
