import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPage from "./HistoryPage";
import type { AuthClient } from "../lib/auth-client";
import { AuthError } from "../lib/auth-client";
const id = "11111111-1111-4111-8111-111111111111",
  eventId = "22222222-2222-4222-8222-222222222222";
const row = {
  id,
  attendanceDate: "2026-10-02",
  department: "Keuangan",
  position: "Analis",
  deletedAt: null,
  deleteReason: null,
  checkIn: {
    id: eventId,
    eventTime: "2026-10-02T08:00:00.000+07:00",
    reason: null,
    isLate: false,
    isEarlyDeparture: false,
    isOutsideSchedule: false,
    location: {
      latitude: -6,
      longitude: 106,
      accuracyMeters: 25,
      capturedAt: "2026-10-02T07:59:50.000+07:00",
    },
    captureMethod: "AUTO",
    policySnapshot: {},
  },
  checkOut: null,
};
const meta = { requestId: id, serverTime: "2026-10-03T08:00:00.000+07:00" };
function setup(params = "", override?: (path: string) => Promise<unknown>) {
  const api = vi.fn(async (path: string) => {
    if (override) return override(path);
    if (path.endsWith("/photo"))
      return {
        data: {
          url: "https://storage.example.test/photo?signature=synthetic",
          expiresInSeconds: 60,
        },
        meta,
      };
    return path.includes("?")
      ? { data: [row], meta: { ...meta, total: 21, page: 1, pageSize: 20 } }
      : { data: row, meta };
  });
  const onParamsChange = vi.fn(),
    onHome = vi.fn(),
    onSessionExpired = vi.fn();
  const client = { api } as unknown as AuthClient;
  const result = render(
    <HistoryPage
      client={client}
      params={new URLSearchParams(params)}
      onParamsChange={onParamsChange}
      onHome={onHome}
      onSessionExpired={onSessionExpired}
    />,
  );
  return {
    api,
    client,
    onParamsChange,
    onHome,
    onSessionExpired,
    ...result,
    user: userEvent.setup(),
  };
}
afterEach(() => vi.useRealTimers());
describe("Personal attendance history", () => {
  it("opens detail with filters intact and paginates only through the own history endpoint", async () => {
    const { user, onParamsChange, api } = setup(
      "startDate=2026-10-01&endDate=2026-10-03",
    );
    await user.click(
      await screen.findByRole("button", { name: "Buka absensi 2 Okt 2026" }),
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
    expect(api.mock.calls[0][0]).toContain("me/attendance?");
    expect(api.mock.calls[0][0]).not.toContain("employeeId");
  });
  it("applies date filters and rejects a reversed range without a request", async () => {
    const { user, onParamsChange } = setup();
    await screen.findByRole("button", { name: "Buka absensi 2 Okt 2026" });
    await user.type(screen.getByLabelText("Dari tanggal"), "2026-10-03");
    await user.type(screen.getByLabelText("Sampai tanggal"), "2026-10-01");
    await user.click(screen.getByRole("button", { name: "Terapkan" }));
    expect(
      await screen.findByText(
        "Tanggal awal harus sebelum atau sama dengan tanggal akhir.",
      ),
    ).toBeInTheDocument();
    expect(onParamsChange).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Sampai tanggal"));
    await user.type(screen.getByLabelText("Sampai tanggal"), "2026-10-04");
    await user.click(screen.getByRole("button", { name: "Terapkan" }));
    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: "2026-10-03",
        endDate: "2026-10-04",
        page: undefined,
      }),
    );
  });
  it("shows original evidence and deletion reason without offering or requesting any photo", async () => {
    const deleted = {
      ...row,
      deletedAt: "2026-10-03T08:00:00.000+07:00",
      deleteReason: "Bukti diperiksa",
    };
    const { api, user, onParamsChange } = setup(
      "id=" + id + "&page=2",
      async () => ({ data: deleted, meta }),
    );
    expect(await screen.findByText("Dihapus HRD")).toBeInTheDocument();
    expect(screen.getByText("Bukti diperiksa")).toBeInTheDocument();
    expect(screen.getByText("08.00.00")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Lihat foto/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(api.mock.calls).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: "Kembali ke riwayat" }),
    );
    expect(onParamsChange).toHaveBeenCalledWith(
      expect.objectContaining({ id: undefined, page: "2" }),
    );
  });
  it("loads photos only when requested and hides a photo after expiry", async () => {
    const { api } = setup("id=" + id);
    await screen.findByRole("button", { name: "Lihat foto check-in" });
    expect(api.mock.calls).toHaveLength(1);
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    try {
      fireEvent.click(
        screen.getByRole("button", { name: "Lihat foto check-in" }),
      );
      await act(async () => {
        await Promise.resolve();
      });
      const image = screen.getByRole("img", {
        name: "Foto check-in 2 Okt 2026",
      });
      expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
      expect(image).toHaveAttribute(
        "src",
        expect.stringContaining("storage.example.test"),
      );
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      await act(() => vi.advanceTimersByTimeAsync(60001));
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Lihat foto check-in" }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
  it("keeps detail when a photo fails, and does not retry automatically", async () => {
    const { user, api } = setup("id=" + id, async (path) => {
      if (path.endsWith("/photo"))
        throw new AuthError(409, "Absensi telah berubah. Muat detail terbaru.");
      return { data: row, meta };
    });
    await user.click(
      await screen.findByRole("button", { name: "Lihat foto check-in" }),
    );
    expect(
      await screen.findByText("Absensi telah berubah. Muat detail terbaru."),
    ).toBeInTheDocument();
    expect(screen.getByText("Keuangan · Analis")).toBeInTheDocument();
    expect(
      api.mock.calls.filter(([path]) => path.endsWith("/photo")),
    ).toHaveLength(1);
  });
  it("rejects an unsafe photo URL without rendering an image", async () => {
    const { user } = setup("id=" + id, async (path) =>
      path.endsWith("/photo")
        ? { data: { url: "javascript:alert(1)", expiresInSeconds: 60 }, meta }
        : { data: row, meta },
    );
    await user.click(
      await screen.findByRole("button", { name: "Lihat foto check-in" }),
    );
    expect(
      await screen.findByText("Riwayat absensi belum dapat diverifikasi."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("hides old rows when a new period fails and handles an expired session", async () => {
    const { client, rerender, onParamsChange, onHome, onSessionExpired, api } =
      setup();
    await screen.findByRole("button", { name: "Buka absensi 2 Okt 2026" });
    api.mockRejectedValueOnce(new AuthError(401, "Sesi berakhir."));
    rerender(
      <HistoryPage
        client={client}
        params={new URLSearchParams("startDate=2026-10-03")}
        onParamsChange={onParamsChange}
        onHome={onHome}
        onSessionExpired={onSessionExpired}
      />,
    );
    await waitFor(() => expect(onSessionExpired).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: "Buka absensi 2 Okt 2026" }),
    ).not.toBeInTheDocument();
  });
});
