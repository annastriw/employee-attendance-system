import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import {
  AuthError,
  type AuthClient,
  type EmployeeUser,
} from "./lib/auth-client";

const employee: EmployeeUser = {
  id: "employee-account",
  email: "employee@example.test",
  employeeId: "employee-profile",
  role: "EMPLOYEE",
  mustChangePassword: true,
};

function client(): AuthClient {
  return {
    restore: vi.fn().mockResolvedValue(null),
    api: vi.fn().mockResolvedValue({
      data: {
        employeeName: "Synthetic Employee",
        attendanceDate: "2026-10-02",
        eligible: true,
        ineligibilityMessage: null,
        schedule: {
          type: "REGULAR_WORKDAY",
          start: "08:00:00",
          end: "17:00:00",
        },
        reasonRequired: false,
        checkoutReasonRequired: false,
        status: "NOT_CHECKED_IN",
        record: null,
      },
      meta: {
        requestId: "visual",
        serverTime: "2026-10-02T07:00:00.000+07:00",
      },
    }),
    currentUser: vi.fn().mockReturnValue(null),
    login: vi.fn().mockResolvedValue(employee),
    changePassword: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}

// Identity and attendance are separate requests; fixtures must not depend on effect order.
function mockTodayResponse(auth: AuthClient, response: unknown) {
  vi.mocked(auth.api).mockImplementation((async (path: string) =>
    path === "me/profile" ? { data: { name: "Synthetic Employee" } } : response
  ) as AuthClient["api"]);
}

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("Employee portal authentication journey", () => {
  it("offers logout only through the account popup during mandatory password change", async () => {
    const auth = client();
    vi.mocked(auth.restore).mockResolvedValue(employee);
    const user = userEvent.setup();
    render(<App client={auth} />);
    await screen.findByRole("heading", { name: "Buat password baru" });
    expect(screen.queryByRole("button", { name: /Keluar/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Menu akun" }));
    expect(screen.queryByRole("menuitem", { name: "Profil" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("menuitem", { name: "Keluar" }));
    await screen.findByRole("heading", { name: "Masuk" });
    expect(auth.logout).toHaveBeenCalledOnce();
  });
  it("closes the shared drawer after navigation, restores menu focus, and persists the rail shortcut", async () => {
    const auth = client();
    vi.mocked(auth.restore).mockResolvedValue({ ...employee, mustChangePassword: false });
    const user = userEvent.setup({ delay: null });
    render(<App client={auth} />);
    await screen.findByRole("heading", { name: "Hari ini" });
    const menu = screen.getByRole("button", { name: "Menu navigasi" });
    await user.click(menu);
    await user.click(within(await screen.findByRole("dialog", { name: "Navigasi" })).getByRole("button", { name: "Tutup navigasi" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigasi" })).not.toBeInTheDocument());
    await waitFor(() => expect(menu).toHaveFocus());
    await user.click(menu);
    const drawer = await screen.findByRole("dialog", { name: "Navigasi" });
    await user.click(within(drawer).getByRole("button", { name: /Pilih tema/ }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Terang" }));
    expect(localStorage.getItem("theme")).toBe("light");
    await user.click(within(drawer).getByRole("button", { name: "Menu akun" }));
    await user.click(await screen.findByRole("menuitem", { name: "Profil" }));
    await screen.findByRole("heading", { name: "Profil" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Navigasi" })).not.toBeInTheDocument());
    await waitFor(() => expect(menu).toHaveFocus());
    await user.keyboard("[[");
    expect(await screen.findByRole("button", { name: "Perluas sidebar" })).toHaveAttribute("aria-expanded", "false");
    expect(localStorage.getItem("employee-sidebar-collapsed")).toBe("true");
    await user.keyboard("[[");
    expect(localStorage.getItem("employee-sidebar-collapsed")).toBeNull();
  });
  it("protects history routes until login and password change, without reading private records", async () => {
    window.history.replaceState(
      null,
      "",
      "/riwayat/11111111-1111-4111-8111-111111111111",
    );
    const auth = client();
    vi.mocked(auth.restore).mockResolvedValue(employee);
    render(<App client={auth} />);
    await screen.findByRole("heading", { name: "Buat password baru" });
    expect(auth.api).not.toHaveBeenCalled();
  });

  it("forces a password change, requires re-login, then shows actual attendance data and logout", async () => {
    const auth = client();
    vi.mocked(auth.login)
      .mockResolvedValueOnce(employee)
      .mockResolvedValueOnce({ ...employee, mustChangePassword: false });
    const user = userEvent.setup({ delay: null });
    render(<App client={auth} />);

    await screen.findByRole("heading", { name: "Masuk" });
    await user.type(screen.getByLabelText("Email"), employee.email);
    await user.type(screen.getByLabelText("Password"), "Temporary-Test-123456");
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    await screen.findByRole("heading", { name: "Buat password baru" });
    expect(window.location.pathname).toBe("/ganti-password");
    expect(
      screen.queryByRole("heading", { name: "Hari ini" }),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText("Password saat ini"),
      "Temporary-Test-123456",
    );
    await user.type(
      screen.getByLabelText("Password baru"),
      "Replacement-Test-123456",
    );
    await user.type(
      screen.getByLabelText("Konfirmasi password baru"),
      "Different-Test-123456",
    );
    await user.click(screen.getByRole("button", { name: "Simpan password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Konfirmasi password belum sama",
    );
    expect(auth.changePassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Konfirmasi password baru"));
    await user.type(
      screen.getByLabelText("Konfirmasi password baru"),
      "Replacement-Test-123456",
    );
    await user.click(screen.getByRole("button", { name: "Simpan password" }));
    await screen.findByRole("heading", { name: "Masuk" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Password berhasil diperbarui",
    );
    expect(
      screen.queryByDisplayValue("Replacement-Test-123456"),
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), employee.email);
    await user.type(
      screen.getByLabelText("Password"),
      "Replacement-Test-123456",
    );
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    await screen.findByRole("heading", { name: "Hari ini" });
    expect(window.location.pathname).toBe("/");
    expect(await screen.findByText("Synthetic Employee")).toBeVisible();
    expect(screen.getByText("Belum check-in")).toBeVisible();
    await user.click(screen.getByRole("link", { name: "Profil" }));
    expect(screen.queryByRole("button", { name: /Keluar/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Menu akun" }));
    await user.click(await screen.findByRole("menuitem", { name: "Keluar" }));
    await screen.findByRole("heading", { name: "Masuk" });
    expect(auth.logout).toHaveBeenCalledTimes(1);
  }, 15000);

  it("guards a deep link and restores an unrestricted employee session", async () => {
    window.history.replaceState(null, "", "/riwayat");
    const signedOut = client();
    const first = render(<App client={signedOut} />);
    await screen.findByRole("heading", { name: "Masuk" });
    await waitFor(() => expect(window.location.pathname).toBe("/masuk"));
    first.unmount();

    const signedIn = client();
    vi.mocked(signedIn.restore).mockResolvedValue({
      ...employee,
      mustChangePassword: false,
    });
    window.history.replaceState(null, "", "/");
    render(<App client={signedIn} />);
    await screen.findByRole("heading", { name: "Hari ini" });
    await waitFor(() => expect(window.location.pathname).toBe("/"));
  });

  it("returns to login when an authenticated action gets 401", async () => {
    const auth = client();
    vi.mocked(auth.restore).mockResolvedValue({
      ...employee,
      mustChangePassword: false,
    });
    vi.mocked(auth.logout).mockRejectedValue(
      new AuthError(401, "Sesi Anda telah berakhir. Silakan masuk kembali."),
    );
    const user = userEvent.setup({ delay: null });
    render(<App client={auth} />);
    await screen.findByRole("heading", { name: "Hari ini" });
    await user.click(screen.getByRole("link", { name: "Profil" }));
    expect(screen.queryByRole("button", { name: /Keluar/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Menu akun" }));
    await user.click(await screen.findByRole("menuitem", { name: "Keluar" }));
    await screen.findByRole("heading", { name: "Masuk" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sesi Anda telah berakhir",
    );
    expect(window.location.pathname).toBe("/masuk");
  });
});
describe("capture route protection", () => {
  it("keeps unauthenticated capture deep links behind login", async () => {
    window.history.replaceState(null, "", "/absen/masuk");
    render(<App client={client()} />);
    await screen.findByRole("heading", { name: "Masuk" });
    expect(window.location.pathname).toBe("/masuk");
    expect(
      screen.queryByRole("button", { name: "Buka kamera" }),
    ).not.toBeInTheDocument();
  });
  it("keeps forced password change ahead of capture", async () => {
    window.history.replaceState(null, "", "/absen/masuk");
    const auth = client();
    vi.mocked(auth.restore).mockResolvedValue(employee);
    render(<App client={auth} />);
    await screen.findByRole("heading", { name: "Buat password baru" });
    expect(window.location.pathname).toBe("/ganti-password");
  });
  it("lets an unrestricted employee open and leave capture after checking eligibility without requesting camera", async () => {
    const auth = client();
    vi.mocked(auth.restore).mockResolvedValue({
      ...employee,
      mustChangePassword: false,
    });
    const user = userEvent.setup({ delay: null });
    render(<App client={auth} />);
    await screen.findByRole("heading", { name: "Hari ini" });
    await screen.findByText("Belum check-in");
    await user.click(screen.getByRole("button", { name: "Check-in" }));
    await screen.findByRole("heading", { name: "Foto check-in" });
    expect(window.location.pathname).toBe("/absen/masuk");
    expect(auth.api).toHaveBeenCalledWith(
      "me/attendance/today",
      expect.anything(),
    );
    expect(vi.mocked(auth.api).mock.calls.filter(c => c[0] === "me/attendance/today").length).toBeGreaterThan(0);
    mockTodayResponse(auth, {
      data: {
        employeeName: "Synthetic Employee",
        attendanceDate: "2026-10-02",
        eligible: true,
        ineligibilityMessage: null,
        schedule: {
          type: "REGULAR_WORKDAY",
          start: "08:00:00",
          end: "17:00:00",
        },
        reasonRequired: false,
        checkoutReasonRequired: false,
        status: "CHECKED_IN",
        record: {
          id: "2f178ed8-8cf4-4aac-9dcb-805828295f88",
          attendanceDate: "2026-10-02",
          deletedAt: null,
          checkIn: {
            id: "ed1ee3a0-0da2-4529-8694-d5e6e582c063",
            eventTime: "2026-10-02T08:00:00.000+07:00",
            isLate: false,
            isOutsideSchedule: false,
            reason: null,
          },
        },
      },
      meta: {
        requestId: "visual",
        serverTime: "2026-10-02T08:00:00.000+07:00",
      },
    });
    await user.click(
      screen.getByRole("button", { name: "Kembali ke beranda" }),
    );
    await screen.findByRole("heading", { name: "Hari ini" });
    expect(
      await screen.findByRole("button", { name: "Checkout" }),
    ).toBeEnabled();
    expect(vi.mocked(auth.api).mock.calls.filter(call => call[0] === "me/attendance/today")).toHaveLength(3);
  });
  it("T22 opens checkout for today's check-in and refetches completed attendance on return", async () => {
    const auth = client();
    vi.mocked(auth.restore).mockResolvedValue({
      ...employee,
      mustChangePassword: false,
    });
    const row = {
      id: "2f178ed8-8cf4-4aac-9dcb-805828295f88",
      attendanceDate: "2026-10-02",
      deletedAt: null,
      checkIn: {
        id: "ed1ee3a0-0da2-4529-8694-d5e6e582c063",
        eventTime: "2026-10-02T08:00:00.000+07:00",
        isLate: false,
        isOutsideSchedule: false,
        reason: null,
      },
    };
    const response = {
      data: {
        employeeName: "Synthetic Employee",
        attendanceDate: row.attendanceDate,
        eligible: true,
        ineligibilityMessage: null,
        schedule: {
          type: "REGULAR_WORKDAY",
          start: "08:00:00",
          end: "17:00:00",
        },
        reasonRequired: false,
        checkoutReasonRequired: true,
        status: "CHECKED_IN",
        record: row,
      },
      meta: {
        requestId: "visual",
        serverTime: "2026-10-02T16:30:00.000+07:00",
      },
    };
    vi.mocked(auth.api).mockResolvedValue(response);
    const user = userEvent.setup({ delay: null });
    render(<App client={auth} />);
    const next = await screen.findByRole("button", { name: "Checkout" });
    await user.click(next);
    await screen.findByRole("heading", { name: "Foto checkout" });
    expect(window.location.pathname).toBe("/absen/pulang");
    mockTodayResponse(auth, {
      ...response,
      data: {
        ...response.data,
        status: "CHECKED_OUT",
        checkoutReasonRequired: false,
        record: {
          ...row,
          checkOut: {
            ...row.checkIn,
            id: "554d6a1b-2f3b-44a8-9a87-7a2d4d8bb8f0",
            eventTime: "2026-10-02T17:00:00.000+07:00",
            isEarlyDeparture: false,
          },
        },
      },
    });
    await user.click(
      screen.getByRole("button", { name: "Kembali ke beranda" }),
    );
    expect(
      await screen.findByRole("button", { name: "Absensi selesai" }),
    ).toBeDisabled();
    expect(screen.getByText("17.00.00")).toBeVisible();
    expect(vi.mocked(auth.api).mock.calls.filter(call => call[0] === "me/attendance/today")).toHaveLength(3);
  });
});

describe("employee browser routes", () => {
  it("opens a history detail from its pathname and exposes the profile route", async () => {
    const recordId = "11111111-1111-4111-8111-111111111111";
    const auth = client();
    vi.mocked(auth.restore).mockResolvedValue({ ...employee, mustChangePassword: false });
    vi.mocked(auth.api).mockRejectedValue(new Error("Fixture detail unavailable"));
    window.history.replaceState(null, "", `/riwayat/${recordId}`);
    const detail = render(<App client={auth} />);
    expect(await screen.findByRole("heading", { name: "Detail absensi" })).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/riwayat/${recordId}`);
    // The header renders before HistoryPage's data-loading effect has run.
    await waitFor(() => expect(auth.api).toHaveBeenCalledWith(`me/attendance/${recordId}`, expect.anything()));
    expect(await screen.findByRole("alert")).toHaveTextContent("Fixture detail unavailable");
    detail.unmount();

    const profileAuth = client();
    vi.mocked(profileAuth.restore).mockResolvedValue({ ...employee, mustChangePassword: false });
    vi.mocked(profileAuth.api).mockResolvedValue({ data: null } as never);
    window.history.replaceState(null, "", "/profil");
    render(<App client={profileAuth} />);
    expect(await screen.findByRole("heading", { name: "Profil" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/profil");
    await waitFor(() => expect(profileAuth.api).toHaveBeenCalledWith("me/profile"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Profil karyawan belum dapat dimuat.");
  });
});
