import { beforeEach, describe, expect, it } from "vitest";
import { isTextEditingTarget, isWorkspacePath, readSidebarCollapsed, SIDEBAR_COLLAPSED_KEY, writeSidebarCollapsed } from "./workspace-preferences";

describe("workspace shell preferences", () => {
  it("keeps deleted attendance separate from the attendance destination", () => {
    expect(isWorkspacePath("/absensi-dihapus", "/absensi")).toBe(false);
    expect(isWorkspacePath("/absensi-dihapus", "/absensi-dihapus")).toBe(true);
    expect(isWorkspacePath("/absensi/detail", "/absensi")).toBe(true);
    expect(isWorkspacePath("/karyawan", "/karyawan")).toBe(true);
  });
  beforeEach(() => localStorage.clear());
  it("persists collapse state and removes the key when expanded", () => {
    writeSidebarCollapsed(localStorage, true);
    expect(readSidebarCollapsed(localStorage)).toBe(true);
    writeSidebarCollapsed(localStorage, false);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBeNull();
    expect(readSidebarCollapsed(localStorage)).toBe(false);
  });
  it("does not claim shortcut keys while editing text", () => {
    expect(isTextEditingTarget(document.createElement("input"))).toBe(true);
    expect(isTextEditingTarget(document.createElement("textarea"))).toBe(true);
    const editable = document.createElement("div"); editable.setAttribute("contenteditable", "true");
    expect(isTextEditingTarget(editable)).toBe(true);
    expect(isTextEditingTarget(document.createElement("main"))).toBe(false);
    expect(isTextEditingTarget(null)).toBe(false);
  });
});
