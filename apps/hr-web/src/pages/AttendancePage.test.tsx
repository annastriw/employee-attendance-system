import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttendancePage } from "./AttendancePage";
import { AuthError } from "../lib/auth-client";
const id = "11111111-1111-4111-8111-111111111111";
const record = {
  id,
  employeeId: id,
  attendanceDate: "2026-10-02",
  version: "2026-10-02T10:00:00.000Z",
  employee: { id, name: "Sari Wijaya", status: "ACTIVE" },
  department: "Keuangan",
  position: "Analis",
  deletedAt: null,
  deleteReason: null,
  deletedByAccountId: null,
  checkIn: {
    id,
    eventTime: "2026-10-02T08:00:00.000+07:00",
    reason: null,
    isLate: false,
    isEarlyDeparture: false,
    isOutsideSchedule: false,
    location: {
      latitude: -6.2088,
      longitude: 106.8456,
      accuracyMeters: 15,
      capturedAt: "2026-10-02T07:59:50.000+07:00",
    },
  },
  checkOut: {
    id: "22222222-2222-4222-8222-222222222222",
    eventTime: "2026-10-02T17:00:00.000+07:00",
    reason: null,
    isLate: false,
    isEarlyDeparture: false,
    isOutsideSchedule: false,
    location: {
      latitude: -6.2091,
      longitude: 106.8459,
      accuracyMeters: 12,
      capturedAt: "2026-10-02T16:59:45.000+07:00",
    },
  },
  history: [],
};
function setup(
  params = "id=" + id,
  override?: (
    path: string,
    init?: { method?: string; body?: unknown },
  ) => Promise<unknown>,
) {
  const api = vi.fn(
    async (path: string, init?: { method?: string; body?: unknown }) => {
      if (override) return override(path, init);
      if (path.startsWith("employees?")) return { items: [], total: 0, page: 1, pageSize: 20 };
      return path.includes("?")
        ? { data: [record], meta: { total: 21, page: 1, pageSize: 20 } }
        : { data: record };
    },
  );
  const onParamsChange = vi.fn(),
    onSessionExpired = vi.fn();
  const rendered = render(
    <AttendancePage
      client={{ api: api as never }}
      params={new URLSearchParams(params)}
      deleted={params.includes("deleted")}
      onParamsChange={onParamsChange}
      onSessionExpired={onSessionExpired}
    />,
  );
  return {
    api,
    onParamsChange,
    onSessionExpired,
    user: userEvent.setup(),
    ...rendered,
  };
}
describe("HRD attendance lifecycle", () => {
  it("requires reason and confirmation of employee/date before deleting the whole day", async () => {
    const { user, api } = setup();
    await user.click(
      await screen.findByRole("button", { name: "Hapus absensi" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Sari Wijaya")).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Hapus satu hari" }),
    );
    expect(
      await screen.findByText("Masukkan alasan penghapusan."),
    ).toBeInTheDocument();
    expect(api.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(
      false,
    );
    await user.type(
      screen.getByLabelText("Alasan penghapusan"),
      "  Bukti perlu diperiksa  ",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Hapus satu hari" }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("attendance/" + id, {
        method: "DELETE",
        body: { version: record.version, reason: "Bukti perlu diperiksa" },
      }),
    );
  });
  it("cancels without mutation and restores using the displayed version", async () => {
    const archived = {
      ...record,
      employee: { ...record.employee, status: "ARCHIVED" },
      deletedAt: "2026-10-03T08:00:00.000+07:00",
      deleteReason: "Periksa bukti",
    };
    const { user, api } = setup("id=" + id + "&deleted=true", async () => ({
      data: archived,
    }));
    await user.click(
      await screen.findByRole("button", { name: "Pulihkan absensi" }),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Batal",
      }),
    );
    expect(api.mock.calls.some(([, init]) => init?.method)).toBe(false);
    await user.click(screen.getByRole("button", { name: "Pulihkan absensi" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Pulihkan",
      }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith("attendance/" + id + "/restore", {
        method: "POST",
        body: { version: record.version },
      }),
    );
  });
  it("blocks retry after an unknown outcome until explicitly refreshing the record", async () => {
    let latest = record;
    const { user, api } = setup(undefined, async (_path, init) => {
      if (init?.method) {
        latest = { ...record, version: "2026-10-03T00:00:00.000Z" };
        throw new AuthError(0, "Koneksi terputus.");
      }
      return { data: latest };
    });
    await user.click(
      await screen.findByRole("button", { name: "Hapus absensi" }),
    );
    await user.type(
      screen.getByLabelText("Alasan penghapusan"),
      "Periksa bukti",
    );
    await user.click(screen.getByRole("button", { name: "Hapus satu hari" }));
    expect(
      await screen.findByText(/Hasil belum dapat dipastikan/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hapus satu hari" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Muat data terbaru" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      api.mock.calls.filter(([, init]) => init?.method === "DELETE"),
    ).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Hapus absensi" }));
    await user.type(
      screen.getByLabelText("Alasan penghapusan"),
      "Konfirmasi baru",
    );
    await user.click(screen.getByRole("button", { name: "Hapus satu hari" }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "attendance/" + id,
        expect.objectContaining({
          body: { version: latest.version, reason: "Konfirmasi baru" },
        }),
      ),
    );
  });
  it("never retries a stale confirmation and reports expired sessions", async () => {
    const { user, api } = setup(undefined, async (_path, init) => {
      if (init?.method) throw new AuthError(409, "Absensi telah berubah.");
      return { data: record };
    });
    await user.click(
      await screen.findByRole("button", { name: "Hapus absensi" }),
    );
    await user.type(
      screen.getByLabelText("Alasan penghapusan"),
      "Periksa bukti",
    );
    await user.click(screen.getByRole("button", { name: "Hapus satu hari" }));
    expect(
      await screen.findByText("Absensi telah berubah."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hapus satu hari" }),
    ).toBeDisabled();
    expect(api.mock.calls.filter(([, init]) => init?.method)).toHaveLength(1);
  });
  it("preserves filters when opening a record and paginates through server results", async () => {
    const { user, onParamsChange } = setup(
      "startDate=2026-10-01&endDate=2026-10-03",
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Buka absensi Sari Wijaya 2 Okt 2026",
      }),
    );
    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        startDate: "2026-10-01",
        endDate: "2026-10-03",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Halaman berikutnya" }),
    );
    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({ page: "2", id: undefined }),
    );
  });
  it("keeps stale rows hidden on a load failure and handles revocation", async () => {
    const { onSessionExpired } = setup("", async () => {
      throw new AuthError(401, "Sesi berakhir.");
    });
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  it("renders dual location maps, coordinates, accuracy and time for check-in and checkout", async () => {
    setup();
    expect(await screen.findByText("Lokasi Check-in")).toBeInTheDocument();
    expect(screen.getByText("Lokasi Checkout")).toBeInTheDocument();
    expect(screen.getByText("-6.208800, 106.845600")).toBeInTheDocument();
    expect(screen.getByText("-6.209100, 106.845900")).toBeInTheDocument();
    expect(screen.getByText("15.0 m")).toBeInTheDocument();
    expect(screen.getByText("12.0 m")).toBeInTheDocument();
    expect(screen.getAllByTestId("attendance-map")).toHaveLength(2);
  });

  it("loads signed private photo on demand and displays image", async () => {
    const { user } = setup("id=" + id, async (path) => {
      if (path.includes("/photo")) {
        return { data: { url: "https://storage.local/photo.jpg", expiresInSeconds: 60 } };
      }
      return { data: record };
    });

    const loadBtn = await screen.findByRole("button", { name: "Lihat foto check-in" });
    await user.click(loadBtn);

    expect(await screen.findByRole("img", { name: /Foto check-in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Muat ulang foto check-in" })).toBeInTheDocument();
  });

  it("allows HRD to load private photo even on soft-deleted attendance record", async () => {
    const deletedRecord = {
      ...record,
      deletedAt: "2026-10-02T10:00:00.000Z",
      deleteReason: "Pemeriksaan",
    };
    const { user } = setup("id=" + id, async (path) => {
      if (path.includes("/photo")) {
        return { data: { url: "https://storage.local/deleted-photo.jpg", expiresInSeconds: 60 } };
      }
      return { data: deletedRecord };
    });

    expect(await screen.findAllByText("Foto absensi (Dihapus HRD)")).toHaveLength(2);
    const loadBtn = screen.getByRole("button", { name: "Lihat foto check-in" });
    await user.click(loadBtn);

    expect(await screen.findByRole("img", { name: /Foto check-in/i })).toBeInTheDocument();
  });
});
