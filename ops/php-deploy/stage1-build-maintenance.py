#!/usr/bin/env python3
import hashlib
import os
import re
import sys

if len(sys.argv) != 4:
    raise SystemExit("usage: stage1-build-maintenance.py BASELINE_HTACCESS SNIPPET OUTPUT")

baseline, snippet_path, output = map(os.path.abspath, sys.argv[1:])
raw = open(baseline, "rb").read()
if hashlib.sha256(raw).hexdigest() != "cbde51c1c9aa1742bc633fadf1435c70d07dd9c7e908728723b522ba9738d817":
    raise SystemExit("production .htaccess baseline drift")
current = raw.decode("utf-8")
snippet = open(snippet_path, encoding="utf-8").read().strip()
pattern = re.compile(
    r"# Install this block once in the site-root \.htaccess, before the public rewrite\..*?</IfModule>\n",
    re.DOTALL,
)
updated, count = pattern.subn(snippet + "\n", current, count=1)
if count != 1:
    raise SystemExit("maintenance block replacement failed")
if updated.count("BEGIN AZMIGRANTAT_API_MAINTENANCE") != 1 or updated.count("END AZMIGRANTAT_API_MAINTENANCE") != 1:
    raise SystemExit("maintenance marker count mismatch")
if os.path.exists(output):
    raise SystemExit("output already exists")
with open(output, "w", encoding="utf-8", newline="") as target:
    target.write(updated)
os.chmod(output, 0o644)
print("maintenance_artifact=ready")
