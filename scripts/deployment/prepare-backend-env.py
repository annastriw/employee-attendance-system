"""Prepare private per-service env files from existing VPS secrets; never overwrite."""
import argparse
import os
from pathlib import Path
import re
import sys


def read_env(path):
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        key, separator, value = line.partition("=")
        if not separator or key in values or not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
            raise ValueError("Invalid secret file format; values were not printed.")
        values[key] = value
    return values


def service_envs(database, application, storage):
    for key in ("AUTH", "EMPLOYEE", "ATTENDANCE", "MEDIA"):
        if not re.fullmatch(r"[0-9a-f]{64}", database.get(key + "_DB_PASSWORD", "")):
            raise ValueError("Invalid database secret; values were not printed.")
    for key, length in (("AUTH_JWT_SECRET", 128), ("PROVISIONING_SERVICE_SECRET", 64),
                        ("PROVISIONING_CREDENTIAL_KEY", 64), ("INTERNAL_SERVICE_SECRET", 64),
                        ("MEDIA_INTERNAL_SECRET", 64)):
        if not re.fullmatch(r"[0-9a-f]{" + str(length) + "}", application.get(key, "")):
            raise ValueError("Invalid application secret; values were not printed.")
    if application["INTERNAL_SERVICE_SECRET"] != application["PROVISIONING_SERVICE_SECRET"]:
        raise ValueError("Internal service secrets must match.")
    access = storage.get("MEDIA_S3_ACCESS_KEY", "")
    secret = storage.get("MEDIA_S3_SECRET_KEY", "")
    if not access or len(secret) < 32 or storage.get("MEDIA_S3_BUCKET") != "attendance-photos":
        raise ValueError("Restricted Media storage credentials are required.")
    if any(c in access + secret for c in "\r\n\0"):
        raise ValueError("Invalid storage credential format.")
    origins = "https://attendance.annastriwidagdo.me,https://hr.annastriwidagdo.me"
    auth_url = "http://127.0.0.1:3001"
    result = {}
    for name, prefix, port in (("api-gateway", None, 3000), ("auth-service", "AUTH", 3001),
                               ("employee-service", "EMPLOYEE", 3002),
                               ("attendance-service", "ATTENDANCE", 3003),
                               ("media-service", "MEDIA", 3004)):
        env = {"NODE_ENV": "production", "HOST": "127.0.0.1", "PORT": str(port)}
        if prefix:
            user = "attendance_" + prefix.lower()
            env[prefix + "_DATABASE_URL"] = (
                f"mysql://{user}:{database[prefix + '_DB_PASSWORD']}@127.0.0.1:3307/attendance_prod")
        if name != "auth-service":
            env["AUTH_SERVICE_URL"] = auth_url
        result[name] = env
    result["api-gateway"].update({"GATEWAY_ALLOWED_ORIGINS": origins,
        "EMPLOYEE_SERVICE_URL": "http://127.0.0.1:3002",
        "ATTENDANCE_SERVICE_URL": "http://127.0.0.1:3003",
        "MEDIA_SERVICE_URL": "http://127.0.0.1:3004"})
    for key in ("AUTH_JWT_SECRET", "PROVISIONING_SERVICE_SECRET", "PROVISIONING_CREDENTIAL_KEY"):
        result["auth-service"][key] = application[key]
    result["auth-service"]["AUTH_ALLOWED_ORIGINS"] = origins
    result["employee-service"]["PROVISIONING_SERVICE_SECRET"] = application["PROVISIONING_SERVICE_SECRET"]
    result["attendance-service"].update({"EMPLOYEE_SERVICE_URL": "http://127.0.0.1:3002",
        "MEDIA_SERVICE_URL": "http://127.0.0.1:3004", "ATTENDANCE_OUTBOX_ENABLED": "true",
        "INTERNAL_SERVICE_SECRET": application["INTERNAL_SERVICE_SECRET"],
        "MEDIA_INTERNAL_SECRET": application["MEDIA_INTERNAL_SECRET"]})
    result["media-service"].update({"MEDIA_S3_ENDPOINT": "http://127.0.0.1:9000",
        "MEDIA_S3_PUBLIC_ENDPOINT": "https://attendance-storage.annastriwidagdo.me",
        "MEDIA_S3_BUCKET": "attendance-photos", "MEDIA_S3_ACCESS_KEY": access,
        "MEDIA_S3_SECRET_KEY": secret, "MEDIA_INTERNAL_SECRET": application["MEDIA_INTERNAL_SECRET"]})
    return result


def prepare(root):
    private = root / ".secrets"
    files = service_envs(read_env(private / "database-runtime.env"),
                         read_env(private / "application.env"), read_env(private / "media-storage.env"))
    target = private / "backend"
    target.mkdir(mode=0o700)  # Existing directory stops preparation; no overwrite or key rotation.
    for service, values in files.items():
        fd = os.open(target / (service + ".env"), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as output:
            output.write("".join(key + "=" + value + "\n" for key, value in values.items()))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("/opt/attendance"))
    args = parser.parse_args()
    try:
        prepare(args.root)
    except (ValueError, OSError):
        print("STOP: verify secret files and whether .secrets/backend already exists; preserve all files.", file=sys.stderr)
        sys.exit(1)
    print("PASS: five private backend environment files prepared")
