import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette, type Command } from "./CommandPalette";
import { filterCommands, fuzzyMatch } from "./command-palette";

function makeCommands(): { commands: Command[]; runs: Record<string, ReturnType<typeof vi.fn>> } {
  const runs = {
    ringkasan: vi.fn(),
    karyawan: vi.fn(),
    dark: vi.fn(),
    logout: vi.fn(),
  };
  const commands: Command[] = [
    { id: "nav-ringkasan", label: "Ringkasan", group: "Navigasi", keywords: "dashboard", run: runs.ringkasan },
    { id: "nav-karyawan", label: "Karyawan", group: "Navigasi", keywords: "employee pegawai", run: runs.karyawan },
    { id: "theme-dark", label: "Tema gelap", group: "Tema", keywords: "dark gelap", run: runs.dark },
    { id: "logout", label: "Keluar", group: "Akun", keywords: "logout sign out", run: runs.logout },
  ];
  return { commands, runs };
}

describe("fuzzyMatch", () => {
  it("matches subsequence case-insensitively and rejects out-of-order", () => {
    expect(fuzzyMatch("kry", "Karyawan")).toBe(true);
    expect(fuzzyMatch("RING", "Ringkasan")).toBe(true);
    expect(fuzzyMatch("", "anything")).toBe(true);
    expect(fuzzyMatch("zzz", "Karyawan")).toBe(false);
    expect(fuzzyMatch("nak", "Karyawan")).toBe(false);
  });
});

describe("filterCommands", () => {
  it("filters by label and keywords, keeping input order", () => {
    const { commands } = makeCommands();
    expect(filterCommands(commands, "").length).toBe(4);
    expect(filterCommands(commands, "pegawai").map((c) => c.id)).toEqual([
      "nav-karyawan",
    ]);
    expect(filterCommands(commands, "tema").map((c) => c.id)).toEqual([
      "theme-dark",
    ]);
  });
});

describe("CommandPalette", () => {
  it("does not render when closed", () => {
    const { commands } = makeCommands();
    render(<CommandPalette open={false} commands={commands} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("filters as the user types and runs the active command on Enter", async () => {
    const { commands, runs } = makeCommands();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette open commands={commands} onClose={onClose} />);

    const input = screen.getByRole("combobox");
    await user.type(input, "karyawan");
    // Only the matching option remains.
    expect(screen.getByRole("option", { name: /Karyawan/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Ringkasan/ })).not.toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(runs.karyawan).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves the active option with arrow keys", async () => {
    const { commands, runs } = makeCommands();
    const user = userEvent.setup();
    render(<CommandPalette open commands={commands} onClose={vi.fn()} />);

    // Focus the search field (the palette autofocuses it in the app).
    await user.click(screen.getByRole("combobox"));
    // First option (Ringkasan) is active by default; ArrowDown moves to Karyawan.
    await user.keyboard("{ArrowDown}{Enter}");
    expect(runs.karyawan).toHaveBeenCalledTimes(1);
    expect(runs.ringkasan).not.toHaveBeenCalled();
  });

  it("closes on Escape without running a command", async () => {
    const { commands, runs } = makeCommands();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<CommandPalette open commands={commands} onClose={onClose} />);

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(Object.values(runs).every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it("shows an empty message when nothing matches", async () => {
    const { commands } = makeCommands();
    const user = userEvent.setup();
    render(<CommandPalette open commands={commands} onClose={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "zzzzzz");
    expect(screen.getByText("Tidak ada perintah yang cocok.")).toBeInTheDocument();
  });
});
