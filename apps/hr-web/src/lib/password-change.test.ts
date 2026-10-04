import { describe, expect, it } from "vitest";
import { passwordChangeError } from "@attendance/ui";

describe("passwordChangeError", () => {
  it("requires a current password and a replacement within policy", () => {
    expect(passwordChangeError("", "long-enough-password", "long-enough-password")).toMatch(/password saat ini/);
    expect(passwordChangeError("old", "short", "short")).toMatch(/minimal 12 karakter/);
    expect(passwordChangeError("old", "a".repeat(73), "a".repeat(73))).toMatch(/72 byte/);
  });
  it("requires a distinct password and matching confirmation", () => {
    expect(passwordChangeError("same-password-123", "same-password-123", "same-password-123")).toMatch(/berbeda/);
    expect(passwordChangeError("old", "new-password-123", "different-password")).toMatch(/belum sama/);
  });
  it("accepts a valid replacement", () => {
    expect(passwordChangeError("old-password", "new-password-123", "new-password-123")).toBeNull();
  });
});
