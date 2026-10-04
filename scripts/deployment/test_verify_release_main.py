import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError


MODULE_PATH = (
    Path(__file__).parents[2] / "infra" / "vps" / "attendance-release-verifier.py"
)
SPEC = importlib.util.spec_from_file_location("attendance_release_verifier", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode()


class VerifyReleaseMainTests(unittest.TestCase):
    def test_accepts_release_that_is_an_ancestor_of_main(self):
        sha = "a" * 40
        response = FakeResponse(
            {
                "status": "ahead",
                "behind_by": 0,
                "ahead_by": 3,
                "base_commit": {"sha": sha},
                "merge_base_commit": {"sha": sha},
            }
        )
        with patch.object(MODULE, "urlopen", return_value=response):
            self.assertTrue(MODULE.release_is_on_main(sha))

    def test_accepts_release_equal_to_main(self):
        sha = "b" * 40
        response = FakeResponse(
            {
                "status": "identical",
                "behind_by": 0,
                "ahead_by": 0,
                "base_commit": {"sha": sha},
                "merge_base_commit": {"sha": sha},
            }
        )
        with patch.object(MODULE, "urlopen", return_value=response):
            self.assertTrue(MODULE.release_is_on_main(sha))

    def test_rejects_commit_not_reachable_from_main(self):
        for status, behind_by in (("behind", 2), ("diverged", 1)):
            response = FakeResponse(
                {
                    "status": status,
                    "behind_by": behind_by,
                    "ahead_by": 1,
                    "base_commit": {"sha": "c" * 40},
                    "merge_base_commit": {"sha": "d" * 40},
                }
            )
            with self.subTest(status=status), patch.object(MODULE, "urlopen", return_value=response):
                self.assertFalse(MODULE.release_is_on_main("c" * 40))

    def test_fails_closed_when_github_cannot_be_checked(self):
        with patch.object(MODULE, "urlopen", side_effect=URLError("unavailable")):
            self.assertFalse(MODULE.release_is_on_main("d" * 40))

    def test_rejects_invalid_sha_without_network_request(self):
        with patch.object(MODULE, "urlopen") as open_url:
            self.assertFalse(MODULE.release_is_on_main("not-a-commit"))
        open_url.assert_not_called()


if __name__ == "__main__":
    unittest.main()
