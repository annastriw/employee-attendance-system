import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepartmentsPage } from "./DepartmentsPage";
import { AuthError } from "../lib/auth-client";
import type { Department } from "../lib/departments";

const finance: Department = {
  id: "11111111-1111-4111-8111-111111111111", name: "Keuangan", code: "FIN", status: "ACTIVE",
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
};

function setup(rows: Department[] = [finance], params = "", fail?: Error) {
  const api = vi.fn(async (path: string, init?: { method?: string; body?: unknown }) => {
    if (fail) throw fail;
    if (!init?.method) return { items: rows, total: rows.length, page: 1, pageSize: 20 };
    if (path === "departments") return { ...finance, id: "new", ...(init.body as object) };
    if (path.endsWith("/deactivate")) return { ...finance, status: "INACTIVE" };
    return finance;
  });
  const onParamsChange = vi.fn();
  const onSessionExpired = vi.fn();
  render(<DepartmentsPage client={{ api: api as never }} params={new URLSearchParams(params)}
    onParamsChange={onParamsChange} onSessionExpired={onSessionExpired} />);
  return { api, onParamsChange, onSessionExpired, user: userEvent.setup() };
}

describe("Departments page", () => {
  it("lists departments with status and actions", async () => {
    setup();
    const table = await screen.findByRole("grid", { name: "Daftar departemen" });
    expect(within(table).getByText("Keuangan")).toBeInTheDocument();
    expect(within(table).getByText("FIN")).toBeInTheDocument();
    expect(within(table).getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nonaktifkan Keuangan" })).toBeEnabled();
    expect(screen.getByText("1-1 dari 1")).toBeInTheDocument();
  });

  it("opens the edit dialog by activating a row", async () => {
    const { user } = setup();
    const table = await screen.findByRole("grid", { name: "Daftar departemen" });
    await user.click(within(table).getByText("FIN"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Nama", { exact: false })).toHaveValue("Keuangan");
  });

  it("separates a first-run empty state from a filter with no results", async () => {
    setup([]);
    expect(await screen.findByText("Belum ada departemen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tambah departemen" })).toBeInTheDocument();
  });

  it("offers clearing filters when a search finds nothing", async () => {
    const { onParamsChange, user } = setup([], "search=xyz");
    expect(await screen.findByText("Tidak ada departemen yang cocok")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bersihkan filter" }));
    expect(onParamsChange).toHaveBeenCalledWith({});
  });

  it("validates, normalises and creates a department", async () => {
    const { api, user } = setup();
    await screen.findByText("Keuangan");
    await user.click(screen.getByRole("button", { name: "Tambah" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Simpan" }));
    expect(within(dialog).getByText("Nama minimal 2 karakter.")).toBeInTheDocument();
    expect(api).toHaveBeenCalledTimes(1);
    await user.type(within(dialog).getByLabelText("Nama", { exact: false }), "  Sumber   Daya ");
    await user.type(within(dialog).getByLabelText("Kode", { exact: false }), "hr-01");
    await user.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith("departments", { method: "POST", body: { name: "Sumber Daya", code: "HR-01" } }));
    expect(await screen.findByRole("status")).toHaveTextContent("Sumber Daya ditambahkan.");
  });

  it("shows a code conflict next to the code field and keeps the input", async () => {
    const { api, user } = setup();
    api.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method) throw new AuthError(409, "Kode departemen sudah digunakan.");
      return { items: [finance], total: 1, page: 1, pageSize: 20 };
    });
    await screen.findByText("Keuangan");
    await user.click(screen.getByRole("button", { name: "Ubah Keuangan" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Simpan" }));
    const code = within(dialog).getByLabelText("Kode", { exact: false });
    expect(await within(dialog).findByText("Kode departemen sudah digunakan.")).toBeInTheDocument();
    expect(code).toHaveAttribute("aria-invalid", "true");
    expect(code).toHaveValue("FIN");
    expect(within(dialog).getByLabelText("Nama", { exact: false })).toHaveValue("Keuangan");
  });

  it("asks for confirmation before deactivating", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: "Nonaktifkan Keuangan" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Data dan riwayat tetap tersimpan");
    expect(api).not.toHaveBeenCalledWith(expect.stringContaining("deactivate"), expect.anything());
    await user.click(within(dialog).getByRole("button", { name: "Nonaktifkan" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(`departments/${finance.id}/deactivate`, { method: "POST" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Keuangan dinonaktifkan.");
  });

  it("debounces search into URL params and resets to the first page", async () => {
    const { onParamsChange, user } = setup([finance], "page=3");
    await screen.findByText("Keuangan");
    await user.type(screen.getByRole("searchbox", { name: "Cari departemen" }), "fin");
    await waitFor(() => expect(onParamsChange).toHaveBeenCalledWith({ search: "fin", status: undefined, page: undefined }));
  });

  it("reports an expired session instead of a generic error", async () => {
    const { onSessionExpired } = setup([], "", new AuthError(401, "Sesi Anda telah berakhir. Silakan masuk kembali."));
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
  });

  it("keeps a network failure visible with a retry", async () => {
    const { api, user } = setup([], "", new AuthError(0, "Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi."));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tidak dapat terhubung");
    expect(screen.queryByText("Belum ada departemen")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(api).toHaveBeenCalledTimes(2);
  });
});
