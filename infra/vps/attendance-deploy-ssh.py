#!/usr/bin/env python3
"""Forced-command entrypoint for the production deploy SSH key."""

from __future__ import annotations

import os
import re
import subprocess
import sys


DEPLOY_COMMAND = re.compile(r"deploy ([0-9a-f]{40}) (true|false)\Z")


def parse_deploy_command(value: str) -> tuple[str, str]:
    match = DEPLOY_COMMAND.fullmatch(value)
    if match is None:
        raise ValueError("Only the fixed deploy command is allowed")
    return match.group(1), match.group(2)


def main() -> int:
    try:
        release_sha, migrations_changed = parse_deploy_command(
            os.environ.get("SSH_ORIGINAL_COMMAND", "")
        )
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 2

    result = subprocess.run(
        ["sudo", "-n", "/usr/local/sbin/attendance-deploy", release_sha, migrations_changed],
        check=False,
    )
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
