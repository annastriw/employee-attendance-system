#!/usr/bin/env python3
"""Report whether a main commit changes backend build inputs or migrations."""

from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path


BACKEND_PREFIXES = (
    "apps/api-gateway/",
    "apps/auth-service/",
    "apps/employee-service/",
    "apps/attendance-service/",
    "apps/media-service/",
    "packages/database/",
    "prisma/",
    "infra/migrator/",
)
BACKEND_FILES = {
    ".dockerignore",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.base.json",
    "infra/Dockerfile.backend",
    "infra/Dockerfile.migrator",
    "infra/prisma-migrator.config.ts",
}
FULL_SHA = re.compile(r"[0-9a-f]{40}\Z")


def detect_changes(paths: list[str]) -> tuple[bool, bool]:
    backend_changed = any(
        path in BACKEND_FILES or path.startswith(BACKEND_PREFIXES)
        for path in paths if not path.lower().endswith(".md")
    )
    migrations_changed = any(
        path.startswith("prisma/migrations/") and path.endswith(".sql")
        for path in paths
    )
    return backend_changed, migrations_changed


def changed_paths(before_sha: str, release_sha: str) -> list[str] | None:
    if (
        not FULL_SHA.fullmatch(before_sha)
        or set(before_sha) == {"0"}
        or not FULL_SHA.fullmatch(release_sha)
    ):
        return None
    result = subprocess.run(
        ["git", "diff", "--name-only", before_sha, release_sha],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.splitlines()


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: detect-release-changes.py BEFORE_SHA RELEASE_SHA", file=sys.stderr)
        return 2

    paths = changed_paths(sys.argv[1], sys.argv[2])
    if paths is None:
        backend_changed, migrations_changed = True, True
    else:
        backend_changed, migrations_changed = detect_changes(paths)

    outputs = (
        f"backend_changed={str(backend_changed).lower()}\n"
        f"migrations_changed={str(migrations_changed).lower()}\n"
    )
    if output_path := os.environ.get("GITHUB_OUTPUT"):
        with Path(output_path).open("a", encoding="utf-8") as output:
            output.write(outputs)
    else:
        sys.stdout.write(outputs)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
