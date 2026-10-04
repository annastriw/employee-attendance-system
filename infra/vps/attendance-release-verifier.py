#!/usr/bin/env python3
"""Fail-closed check that a deploy SHA is reachable from the public main branch."""

from __future__ import annotations

import json
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


FULL_SHA = re.compile(r"[0-9a-f]{40}\Z")
COMPARE_URL = (
    "https://api.github.com/repos/annastriw/employee-attendance-system/compare/"
    "{release_sha}...main"
)


def release_is_on_main(release_sha: str) -> bool:
    if FULL_SHA.fullmatch(release_sha) is None:
        return False

    request = Request(
        COMPARE_URL.format(release_sha=release_sha),
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "attendance-vps-deployer",
        },
    )
    try:
        with urlopen(request, timeout=15) as response:
            comparison = json.load(response)
    except (HTTPError, URLError, TimeoutError, OSError, ValueError):
        return False

    if not isinstance(comparison, dict):
        return False

    status = comparison.get("status")
    behind_by = comparison.get("behind_by")
    merge_base = comparison.get("merge_base_commit")
    base_commit = comparison.get("base_commit")
    return (
        status in {"ahead", "identical"}
        and behind_by == 0
        and isinstance(merge_base, dict)
        and merge_base.get("sha") == release_sha
        and isinstance(base_commit, dict)
        and base_commit.get("sha") == release_sha
    )


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: attendance-release-verifier RELEASE_SHA", file=sys.stderr)
        return 2

    release_sha = sys.argv[1]
    if not release_is_on_main(release_sha):
        print("FAIL: release SHA is not verified as an ancestor of main", file=sys.stderr)
        return 1

    print("PASS: release SHA is reachable from main")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
