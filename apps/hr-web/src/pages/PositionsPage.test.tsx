import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PositionsPage } from "./PositionsPage";
import { AuthError } from "../lib/auth-client";
import type { Position } from "../lib/positions";

const finance: Position = {
  id: "11111111-1111-4111-8111-111111111111", name: "Keuangan", code: "FIN", status: "ACTIVE",
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
};

function setup(rows: Position[] = [finance], params = "", fail?: Error) {
  const api = vi.fn(async (path: string, init?: { method?: string; body?: unknown }) => {
    if (fail) throw fail;
    if (!init?.method) return { items: rows, total: rows.length, page: 1, pageSize: 20 };
    if (path === "positions") return { ...finance, id: "new", ...(init.body as object) };
    if (path.endsWith("/deactivate")) return { ...finance, status: "INACTIVE" };
    return finance;
  });
  const onParamsChange = vi.fn();
  const onSessionExpired = vi.fn();
  render(<PositionsPage client={{ api: api as never }} params={new URLSearchParams(params)}
    onParamsChange={onParamsChange} onSessionExpired={onSessionExpired} />);
  return { api, onParamsChange, onSessionExpired, user: userEvent.setup() };
}

describe("Positions page", () => {
  it("preserves search while changing status and resets pagination", async () => {
    const { api, onParamsChange, user } = setup([finance], "search=fin&status=ACTIVE&page=3");
    await screen.findByRole("grid", { name: "Daftar jabatan" });
    const query = new URLSearchParams(api.mock.calls.find(([path]) => path.startsWith("positions?"))![0].split("?")[1]);
    expect(query.get("search")).toBe("fin"); expect(query.get("status")).toBe("ACTIVE"); expect(query.get("page")).toBe("3");
    await user.click(screen.getByRole("radio", { name: "Nonaktif" }));
    expect(onParamsChange).toHaveBeenLastCalledWith({ search: "fin", status: "INACTIVE", page: undefined });
    await user.click(screen.getByRole("button", { name: "Reset filter" }));
    expect(onParamsChange).toHaveBeenLastCalledWith({});
  });

  it("shows an activation failure and keeps the inactive row", async () => {
    const { api, user } = setup([{ ...finance, status: "INACTIVE" }]);
    await screen.findByText("Keuangan");
    api.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method) throw new AuthError(503, "Layanan data karyawan sementara tidak tersedia.");
      return { items: [{ ...finance, status: "INACTIVE" }], total: 1, page: 1, pageSize: 20 };
    });
    await user.click(screen.getByRole("button", { name: "Aktifkan Keuangan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Layanan data karyawan sementara tidak tersedia.");
    expect(screen.getByRole("button", { name: "Aktifkan Keuangan" })).toBeEnabled();
  });

  it("updates through the position endpoint", async () => {
    const { api, user } = setup();
    await user.click(await screen.findByRole("button", { name: "Ubah Keuangan" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(`positions/${finance.id}`, { method: "PATCH", body: { name: finance.name, code: finance.code } }));
  });
  it("removes the stale inactive row during refetch after activation", async () => {
    const { api, user } = setup([{ ...finance, status: "INACTIVE" }], "status=INACTIVE");
    let finish: ((value: unknown) => void) | undefined;
    await screen.findByText("Keuangan");
    api.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method) return finance;
      return new Promise(resolve => { finish = resolve; }) as never;
    });
    await user.click(screen.getByRole("button", { name: "Aktifkan Keuangan" }));
    expect(await screen.findByRole("status")).toHaveTextContent("diaktifkan kembali.");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Memuat jabatan")).toBeInTheDocument();
    finish?.({ items: [], total: 0, page: 1, pageSize: 20 });
    expect(await screen.findByText("Tidak ada jabatan yang cocok")).toBeInTheDocument();
  });

  it("lists positions with status and actions", async () => {
    setup();
    const table = await screen.findByRole("grid", { name: "Daftar jabatan" });
    expect(within(table).getByText("Keuangan")).toBeInTheDocument();
    expect(within(table).getByText("FIN")).toBeInTheDocument();
    expect(within(table).getByText("Aktif")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nonaktifkan Keuangan" })).toBeEnabled();
    expect(screen.getByText("1-1 dari 1")).toBeInTheDocument();
  });

  it("separates a first-run empty state from a filter with no results", async () => {
    setup([]);
    expect(await screen.findByText("Belum ada jabatan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tambah jabatan" })).toBeInTheDocument();
  });

  it("offers clearing filters when a search finds nothing", async () => {
    const { onParamsChange, user } = setup([], "search=xyz");
    expect(await screen.findByText("Tidak ada jabatan yang cocok")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bersihkan filter" }));
    expect(onParamsChange).toHaveBeenCalledWith({});
  });

  it("validates, normalises and creates a position", async () => {
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
    await waitFor(() => expect(api).toHaveBeenCalledWith("positions", { method: "POST", body: { name: "Sumber Daya", code: "HR-01" } }));
    expect(await screen.findByRole("status")).toHaveTextContent("Sumber Daya ditambahkan.");
  });

  it("shows a code conflict next to the code field and keeps the input", async () => {
    const { api, user } = setup();
    api.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method) throw new AuthError(409, "Kode jabatan sudah digunakan.");
      return { items: [finance], total: 1, page: 1, pageSize: 20 };
    });
    await screen.findByText("Keuangan");
    await user.click(screen.getByRole("button", { name: "Ubah Keuangan" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Simpan" }));
    const code = within(dialog).getByLabelText("Kode", { exact: false });
    expect(await within(dialog).findByText("Kode jabatan sudah digunakan.")).toBeInTheDocument();
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
    await waitFor(() => expect(api).toHaveBeenCalledWith(`positions/${finance.id}/deactivate`, { method: "POST" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Keuangan dinonaktifkan.");
  });

  it("debounces search into URL params and resets to the first page", async () => {
    const { onParamsChange, user } = setup([finance], "page=3");
    await screen.findByText("Keuangan");
    await user.type(screen.getByRole("searchbox", { name: "Cari jabatan" }), "fin");
    await waitFor(() => expect(onParamsChange).toHaveBeenCalledWith({ search: "fin", status: undefined, page: undefined }));
  });

  it("reports an expired session instead of a generic error", async () => {
    const { onSessionExpired } = setup([], "", new AuthError(401, "Sesi Anda telah berakhir. Silakan masuk kembali."));
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
  });

  it("keeps a network failure visible with a retry", async () => {
    const { api, user } = setup([], "", new AuthError(0, "Tidak dapat terhubung. Periksa koneksi Anda dan coba lagi."));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tidak dapat terhubung");
    expect(screen.queryByText("Belum ada jabatan")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(api).toHaveBeenCalledTimes(2);
  });
});
