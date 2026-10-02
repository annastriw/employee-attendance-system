import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "./LoginPage";

const props = () => ({
  busy: false,
  error: "",
  message: "",
  onSubmit: vi.fn().mockResolvedValue(undefined),
});

describe("Employee login page", () => {
  it("uses the centered Attendance shell and submits validated credentials", async () => {
    const page = props();
    const user = userEvent.setup();
    render(<LoginPage {...page} />);
    expect(screen.getByRole("main")).toHaveClass("auth-main");
    expect(screen.getByRole("main")).not.toHaveClass("auth-split");
    expect(screen.getByRole("heading", { name: "Masuk" })).toBeVisible();
    await user.type(screen.getByLabelText("Email"), " employee@example.test ");
    await user.type(screen.getByLabelText("Password"), "temporary-password");
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    expect(page.onSubmit).toHaveBeenCalledWith(
      "employee@example.test",
      "temporary-password",
    );
  });

  it("validates email and password length without calling login", async () => {
    const page = props();
    const user = userEvent.setup();
    render(<LoginPage {...page} />);
    await user.type(screen.getByLabelText("Email"), "invalid");
    await user.type(screen.getByLabelText("Password"), "a".repeat(73));
    await user.click(screen.getByRole("button", { name: "Masuk" }));
    expect(screen.getByRole("alert")).toHaveTextContent("maksimal 72 byte");
    expect(page.onSubmit).not.toHaveBeenCalled();
  });

  it("supports the keyboard-accessible password toggle and clear errors", async () => {
    const page = props();
    const user = userEvent.setup();
    const view = render(<LoginPage {...page} />);
    const toggle = screen.getByRole("button", { name: "Tampilkan password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Sembunyikan password" }))
      .toHaveAttribute("aria-pressed", "true");
    view.rerender(<LoginPage {...page} error="Layanan tidak tersedia." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Layanan tidak tersedia.");
    view.rerender(<LoginPage {...page} busy error="" />);
    expect(screen.getByRole("button", { name: "Sedang masuk…" })).toBeDisabled();
  });
});