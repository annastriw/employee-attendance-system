import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("detect-release-changes.py")
SPEC = importlib.util.spec_from_file_location("detect_release_changes", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class DetectReleaseChangesTests(unittest.TestCase):
    def test_frontend_only_changes_do_not_deploy_backend(self):
        self.assertEqual(
            MODULE.detect_changes(
                ["apps/attendance-web/src/App.tsx", "packages/ui/src/Button.tsx"]
            ),
            (False, False),
        )

    def test_backend_service_changes_publish_backend(self):
        self.assertEqual(MODULE.detect_changes(["apps/auth-service/src/auth.service.ts"]), (True, False))

    def test_database_migration_changes_publish_backend_and_run_migrations(self):
        self.assertEqual(
            MODULE.detect_changes(["prisma/migrations/20261004120000_change/migration.sql"]),
            (True, True),
        )

    def test_backend_build_inputs_publish_backend(self):
        self.assertEqual(MODULE.detect_changes(["pnpm-lock.yaml"]), (True, False))

    def test_documentation_only_changes_do_not_deploy_backend(self):
        self.assertEqual(MODULE.detect_changes(["docs/deployment/vps-auto-deploy.md"]), (False, False))

    def test_initial_push_falls_back_to_building_backend_and_migrator(self):
        self.assertIsNone(MODULE.changed_paths("0" * 40, "a" * 40))


if __name__ == "__main__":
    unittest.main()
