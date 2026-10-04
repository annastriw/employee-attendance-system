import runpy
from pathlib import Path
import tempfile
import unittest

MODULE = runpy.run_path(str(Path(__file__).with_name("prepare-backend-env.py")))


class BackendEnvironmentTest(unittest.TestCase):
    def setUp(self):
        self.database = {name + "_DB_PASSWORD": "a" * 64
                         for name in ("AUTH", "EMPLOYEE", "ATTENDANCE", "MEDIA")}
        self.application = {"AUTH_JWT_SECRET": "b" * 128,
                            "PROVISIONING_SERVICE_SECRET": "c" * 64,
                            "PROVISIONING_CREDENTIAL_KEY": "d" * 64,
                            "INTERNAL_SERVICE_SECRET": "c" * 64,
                            "MEDIA_INTERNAL_SECRET": "e" * 64}
        self.storage = {"MEDIA_S3_ACCESS_KEY": "restricted-media",
                        "MEDIA_S3_SECRET_KEY": "secret$with#quotes'" * 4,
                        "MEDIA_S3_BUCKET": "attendance-photos"}

    def test_each_service_receives_only_its_credentials_and_loopback_connections(self):
        files = MODULE["service_envs"](self.database, self.application, self.storage)
        self.assertFalse(any("SECRET" in key or "DATABASE" in key for key in files["api-gateway"]))
        for name, prefix in (("auth-service", "AUTH"), ("employee-service", "EMPLOYEE"),
                             ("attendance-service", "ATTENDANCE"), ("media-service", "MEDIA")):
            env = files[name]
            self.assertEqual([key for key in env if key.endswith("DATABASE_URL")], [prefix + "_DATABASE_URL"])
            self.assertIn("@127.0.0.1:3307/attendance_prod", env[prefix + "_DATABASE_URL"])
            self.assertEqual(env["HOST"], "127.0.0.1")
            if name != "auth-service":
                self.assertNotIn("AUTH_JWT_SECRET", env)
                self.assertNotIn("PROVISIONING_CREDENTIAL_KEY", env)
            if name != "media-service":
                self.assertNotIn("MEDIA_S3_SECRET_KEY", env)
        self.assertEqual(files["attendance-service"]["INTERNAL_SERVICE_SECRET"],
                         files["employee-service"]["PROVISIONING_SERVICE_SECRET"])

    def test_invalid_or_mismatched_credentials_are_rejected_without_disclosure(self):
        self.application["INTERNAL_SERVICE_SECRET"] = "f" * 64
        with self.assertRaises(ValueError) as error:
            MODULE["service_envs"](self.database, self.application, self.storage)
        self.assertNotIn("f" * 64, str(error.exception))
        self.application["INTERNAL_SERVICE_SECRET"] = "c" * 64
        self.database["AUTH_DB_PASSWORD"] = "not-a-secret-format"
        with self.assertRaises(ValueError):
            MODULE["service_envs"](self.database, self.application, self.storage)

    def test_preparation_preserves_storage_values_and_never_overwrites(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as temp:
            root = Path(temp)
            private = root / ".secrets"
            private.mkdir()
            for name, values in (("database-runtime.env", self.database),
                                 ("application.env", self.application), ("media-storage.env", self.storage)):
                (private / name).write_text("".join(f"{key}={value}\n" for key, value in values.items()))
            MODULE["prepare"](root)
            media = private / "backend/media-service.env"
            self.assertEqual(MODULE["read_env"](media)["MEDIA_S3_SECRET_KEY"], self.storage["MEDIA_S3_SECRET_KEY"])
            before = media.read_bytes()
            with self.assertRaises(FileExistsError):
                MODULE["prepare"](root)
            self.assertEqual(media.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
