#!/usr/bin/env python3
import re
import sys

blocked = re.compile(
    rb"^\s*(?:USE\b|CREATE\s+DATABASE\b|DROP\s+DATABASE\b|GRANT\b|REVOKE\b|"
    rb"INSTALL\b|UNINSTALL\b|SET\s+GLOBAL\b|CHANGE\s+(?:MASTER|REPLICATION\s+SOURCE)\b|"
    rb"RESET\s+(?:MASTER|REPLICA|SLAVE)\b|SHUTDOWN\b)",
    re.IGNORECASE,
)

lines = 0
bytes_read = 0
for line in sys.stdin.buffer:
    lines += 1
    bytes_read += len(line)
    if blocked.search(line):
        print(f"blocked_statement_line={lines}", file=sys.stderr)
        raise SystemExit(1)

print(f"sql_scan_lines={lines}")
print(f"sql_scan_bytes={bytes_read}")
print("sql_cross_database_statements=none")
