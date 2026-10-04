import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { memoryRouter } from "./test/router";
import type { AuthClient, AdminUser } from "./lib/auth-client";
const admin: AdminUser = {
  id: "test-admin",
  email: "admin@example.test",
  role: "ADMIN_HRD",
  employeeId: null,
  mustChangePassword: true,
};
function client(): AuthClient {
  return {
    restore: vi.fn().mockResolvedValue(null),
    api: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    currentUser: vi.fn().mockReturnValue(admin),
    login: vi.fn().mockResolvedValue(admin),
    changePassword: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
  };
}
describe("HR portal authentication journey", () => {
  it("requires password change, validates confirmation and returns to login after success", async () => {
    const api = client();
    const user = userEvent.setup();
    render(<App client={api} router={memoryRouter(["/"])} />);
    await screen.findByRole("heading", { name: "Masuk" });
    await user.type(screen.getByLabelText("Email"), admin.email);
    await user.type(screen.getByLabelText("Password"), "Initial-Test-123456");
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    await screen.findByRole("heading", { name: "Buat password baru" });
    expect(
      screen.queryByRole("heading", { name: "Ringkasan" }),
    ).not.toBeInTheDocument();
    await user.type(
      screen.getByLabelText("Password saat ini"),
      "Initial-Test-123456",
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
      "Konfirmasi password belum sama.",
    );
    expect(api.changePassword).not.toHaveBeenCalled();
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
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });
  it("restores the dashboard and supports logout", async () => {
    const api = client();
    vi.mocked(api.restore).mockResolvedValue({
      ...admin,
      mustChangePassword: false,
    });
    const user = userEvent.setup();
    render(<App client={api} router={memoryRouter(["/"])} />);
    await screen.findByRole("heading", { name: "Ringkasan" });
    expect(await screen.findByText("Karyawan Aktif")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Menu akun" }));
    await user.click(await screen.findByRole("menuitem", { name: "Keluar" }));
    await screen.findByRole("heading", { name: "Masuk" });
    expect(api.logout).toHaveBeenCalledTimes(1);
  });
  it("keeps the form usable after a failed login", async () => {
    const api = client();
    vi.mocked(api.login).mockRejectedValue(
      new Error("Email atau password salah."),
    );
    const user = userEvent.setup();
    render(<App client={api} router={memoryRouter(["/"])} />);
    await screen.findByRole("heading", { name: "Masuk" });
    await user.type(screen.getByLabelText("Email"), admin.email);
    await user.type(screen.getByLabelText("Password"), "Incorrect-Test-123456");
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email atau password salah.",
    );
    expect(screen.getByRole("button", { name: "Masuk" })).toBeEnabled();
  });
  it("rejects overlong UTF-8 passwords and counts emoji as characters", async () => {
    const api = client();
    vi.mocked(api.restore).mockResolvedValue(admin);
    const user = userEvent.setup();
    render(<App client={api} router={memoryRouter(["/"])} />);
    await screen.findByRole("heading", { name: "Buat password baru" });
    await user.type(
      screen.getByLabelText("Password saat ini"),
      "Initial-Test-123456",
    );
    await user.type(screen.getByLabelText("Password baru"), "é".repeat(37));
    await user.type(
      screen.getByLabelText("Konfirmasi password baru"),
      "é".repeat(37),
    );
    await user.click(screen.getByRole("button", { name: "Simpan password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "maksimal 72 byte",
    );
    expect(api.changePassword).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Password baru"));
    await user.type(screen.getByLabelText("Password baru"), "🙂".repeat(6));
    await user.click(screen.getByRole("button", { name: "Simpan password" }));
    expect(screen.getByRole("alert")).toHaveTextContent("minimal 12 karakter");
    expect(api.changePassword).not.toHaveBeenCalled();
  });
});
