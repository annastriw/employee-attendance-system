import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { AuthError, type AuthClient, type EmployeeUser } from "./lib/auth-client";

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
    api: vi.fn().mockResolvedValue({}),
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
  it("forces a password change, requires re-login, then shows an honest home and logout", async () => {
    const auth = client();
    vi.mocked(auth.login)
      .mockResolvedValueOnce(employee)
      .mockResolvedValueOnce({ ...employee, mustChangePassword: false });
    const user = userEvent.setup();
    render(<App client={auth} />);

    await screen.findByRole("heading", { name: "Masuk" });
    await user.type(screen.getByLabelText("Email"), employee.email);
    await user.type(screen.getByLabelText("Password"), "Temporary-Test-123456");
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    await screen.findByRole("heading", { name: "Buat password baru" });
    expect(window.location.hash).toBe("#ganti-password");
    expect(screen.queryByRole("heading", { name: "Beranda" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Password saat ini"), "Temporary-Test-123456");
    await user.type(screen.getByLabelText("Password baru"), "Replacement-Test-123456");
    await user.type(screen.getByLabelText("Konfirmasi password baru"), "Different-Test-123456");
    await user.click(screen.getByRole("button", { name: "Simpan password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Konfirmasi password belum sama");
    expect(auth.changePassword).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Konfirmasi password baru"));
    await user.type(screen.getByLabelText("Konfirmasi password baru"), "Replacement-Test-123456");
    await user.click(screen.getByRole("button", { name: "Simpan password" }));
    await screen.findByRole("heading", { name: "Masuk" });
    expect(screen.getByRole("status")).toHaveTextContent("Password berhasil diperbarui");
    expect(screen.queryByDisplayValue("Replacement-Test-123456")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), employee.email);
    await user.type(screen.getByLabelText("Password"), "Replacement-Test-123456");
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    await screen.findByRole("heading", { name: "Beranda" });
    expect(window.location.hash).toBe("#beranda");
    expect(screen.getByText(employee.email)).toBeVisible();
    expect(screen.getByText("Fitur check-in dan checkout sedang disiapkan.")).toBeVisible();
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
    await screen.findByRole("heading", { name: "Beranda" });
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
    const user = userEvent.setup();
    render(<App client={auth} />);
    await screen.findByRole("heading", { name: "Beranda" });
    await user.click(screen.getByRole("button", { name: "Keluar" }));
    await screen.findByRole("heading", { name: "Masuk" });
    expect(screen.getByRole("alert")).toHaveTextContent("Sesi Anda telah berakhir");
    expect(window.location.hash).toBe("#masuk");
  });
});