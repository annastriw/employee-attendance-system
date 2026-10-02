import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("Employee portal authentication journey", () => {
  it("protects history routes until login and password change, without reading private records", async () => {
    window.history.replaceState(
      null,
      "",
      "/#riwayat?id=11111111-1111-4111-8111-111111111111",
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
    expect(window.location.hash).toBe("#ganti-password");
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
    expect(window.location.hash).toBe("#beranda");
    expect(await screen.findByText("Synthetic Employee")).toBeVisible();
    expect(screen.getByText("Belum check-in")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Keluar" }));
    await screen.findByRole("heading", { name: "Masuk" });
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it("guards a deep link and restores an unrestricted employee session", async () => {
    window.history.replaceState(null, "", "/#beranda");
    const signedOut = client();
    const first = render(<App client={signedOut} />);
    await screen.findByRole("heading", { name: "Masuk" });
    expect(window.location.hash).toBe("#masuk");
    first.unmount();

    const signedIn = client();
    vi.mocked(signedIn.restore).mockResolvedValue({
      ...employee,
      mustChangePassword: false,
    });
    render(<App client={signedIn} />);
    await screen.findByRole("heading", { name: "Hari ini" });
    expect(window.location.hash).toBe("#beranda");
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
    await user.click(screen.getByRole("button", { name: "Keluar" }));
    await screen.findByRole("heading", { name: "Masuk" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sesi Anda telah berakhir",
    );
    expect(window.location.hash).toBe("#masuk");
  });
});
describe("capture route protection", () => {
  it("keeps unauthenticated capture deep links behind login", async () => {
    window.history.replaceState(null, "", "/#foto-checkin");
    render(<App client={client()} />);
    await screen.findByRole("heading", { name: "Masuk" });
    expect(window.location.hash).toBe("#masuk");
    expect(
      screen.queryByRole("button", { name: "Buka kamera" }),
    ).not.toBeInTheDocument();
  });
  it("keeps forced password change ahead of capture", async () => {
    window.history.replaceState(null, "", "/#foto-checkin");
    const auth = client();
    vi.mocked(auth.restore).mockResolvedValue(employee);
    render(<App client={auth} />);
    await screen.findByRole("heading", { name: "Buat password baru" });
    expect(window.location.hash).toBe("#ganti-password");
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
    expect(window.location.hash).toBe("#foto-checkin");
    expect(auth.api).toHaveBeenCalledWith(
      "me/attendance/today",
      expect.anything(),
    );
    expect(
      vi
        .mocked(auth.api)
        .mock.calls.every((c) => c[0] === "me/attendance/today"),
    ).toBe(true);
    vi.mocked(auth.api).mockResolvedValueOnce({
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
    expect(auth.api).toHaveBeenCalledTimes(3);
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
    expect(window.location.hash).toBe("#foto-checkout");
    vi.mocked(auth.api).mockResolvedValueOnce({
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
    expect(auth.api).toHaveBeenCalledTimes(3);
  });
});
