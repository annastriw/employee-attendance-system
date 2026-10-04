import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).parents[2] / "infra" / "vps" / "attendance-deploy-ssh.py"
SPEC = importlib.util.spec_from_file_location("attendance_deploy_ssh", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class ParseDeployCommandTests(unittest.TestCase):
    def test_accepts_full_lowercase_commit_and_migration_flag(self):
        sha = "a" * 40
        self.assertEqual(MODULE.parse_deploy_command(f"deploy {sha} true"), (sha, "true"))

    def test_rejects_shell_metacharacters_and_extra_arguments(self):
        for command in (
            "deploy " + "a" * 40 + " true; id",
            "deploy " + "a" * 40 + " false extra",
            "deploy " + "A" * 40 + " false",
            "sudo docker ps",
        ):
            with self.subTest(command=command), self.assertRaises(ValueError):
                MODULE.parse_deploy_command(command)


if __name__ == "__main__":
    unittest.main()
