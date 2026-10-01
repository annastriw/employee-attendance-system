import { test, expect } from "@playwright/test";
for (const portal of ["hr", "attendance"] as const) {
  for (const width of [320, 768, 1024, 1440]) {
    test(portal + ": shared theme and usable layout at " + width + "px", async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      if (portal === "hr")
        await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
      await page.goto(portal === "hr" ? "http://127.0.0.1:15175" : "http://127.0.0.1:15173");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const layout = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return { overflow: document.documentElement.scrollWidth > innerWidth, accent: style.getPropertyValue("--accent").trim(), scheme: style.colorScheme };
      });
      expect(layout.overflow).toBe(false);
      expect(layout.accent).toBe("#292929");
      expect(layout.scheme).toBe("light");
      await expect(page.locator(".auth-content")).toBeVisible();
      await expect(page.locator(".auth-aside")).toHaveCount(0);
      if (portal === "hr") {
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
        await expect(page.getByRole("button", { name: "Masuk", exact: true })).toBeEnabled();
      }
      else {
        await expect(page.getByText("Login karyawan belum tersedia.")).toBeVisible();
      }
      await page.screenshot({ path: info.outputPath(portal + "-" + width + ".png"), fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}

for (const width of [320, 768, 1024, 1440]) {
  test("HR navigation and account menu at " + width + "px", async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/v1/auth/refresh", route => route.fulfill({
      json: { accessToken: "ui-test-session", expiresIn: 3600,
        user: { id: "ui-test", email: "admin@example.test", role: "ADMIN_HRD", employeeId: null, mustChangePassword: false } },
    }));
    await page.goto("http://127.0.0.1:15175");
    await expect(page.getByRole("heading", { name: "Ringkasan" })).toBeVisible();
    if (width < 768) {
      const toggle = page.getByRole("button", { name: "Menu navigasi" });
      await expect(page.getByRole("navigation", { name: "Navigasi mobile" })).toBeHidden();
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await page.getByRole("navigation", { name: "Navigasi mobile" }).getByRole("link").focus();
      await page.keyboard.press("Escape");
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
    } else {
      await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Menu navigasi" })).toBeHidden();
    }
    const account = page.getByRole("button", { name: "Menu akun" });
    await account.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Keluar" })).toBeVisible();
    await expect(page.getByText("admin@example.test")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(account).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: info.outputPath("dashboard-" + width + ".png"), fullPage: true });
  });
}
