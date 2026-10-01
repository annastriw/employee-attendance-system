import { test, expect } from "@playwright/test";
for (const scheme of ["light", "dark"] as const) {
for (const portal of ["hr", "attendance"] as const) {
  for (const width of [320, 768, 1024, 1440]) {
    test(portal + " " + scheme + ": shared theme and usable layout at " + width + "px", async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      if (portal === "hr")
        await page.route("**/api/v1/auth/refresh", route => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
      await page.goto(portal === "hr" ? "http://127.0.0.1:15175" : "http://127.0.0.1:15173");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const layout = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          accent: root.getPropertyValue("--accent").trim(),
          scheme: root.colorScheme,
          font: getComputedStyle(document.body).fontFamily,
        };
      });
      expect(layout.overflow).toBe(false);
      expect(layout.accent).toBe(scheme === "dark" ? "#34d399" : "#047857");
      expect(layout.scheme).toBe(scheme);
      expect(layout.font).toContain("Geist");
      await expect(page.locator(".auth-content")).toBeVisible();
      await expect(page.locator(".brand-mark")).toBeVisible();
      if (portal === "hr") {
        const showcase = page.locator(".auth-showcase");
        await expect(showcase).toHaveCount(1);
        if (width >= 1024) await expect(showcase).toBeVisible();
        else await expect(showcase).toBeHidden();
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
        await expect(page.getByRole("button", { name: "Masuk", exact: true })).toBeEnabled();
      }
      else {
        await expect(page.locator(".auth-showcase")).toHaveCount(0);
        await expect(page.getByText("Login karyawan belum tersedia.")).toBeVisible();
      }
      await page.screenshot({ path: info.outputPath(portal + "-" + scheme + "-" + width + ".png"), fullPage: true });
      expect(errors).toEqual([]);
    });
  }
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
      await page.getByRole("navigation", { name: "Navigasi mobile" }).getByRole("link").first().focus();
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


const departments = [
  ["Keuangan", "FIN", "ACTIVE"], ["Operasional Gudang Regional Timur", "OPS-EAST", "ACTIVE"],
  ["Sumber Daya Manusia", "HR", "ACTIVE"], ["Riset dan Pengembangan", "RND", "INACTIVE"],
].map(([name, code, status], index) => ({
  id: `0000000${index}-0000-4000-8000-00000000000${index}`, name, code, status,
  createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
}));

for (const master of [{ resource: "departments", route: "departemen", title: "Departemen", label: "departemen" }, { resource: "positions", route: "jabatan", title: "Jabatan", label: "jabatan" }]) {
for (const scheme of ["light", "dark"] as const) {
  for (const width of [320, 768, 1024, 1440]) {
    test(`HR ${master.resource} ${scheme} layout at ${width}px`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/api/v1/auth/refresh", route => route.fulfill({
        json: { accessToken: "ui-test-session", expiresIn: 3600,
          user: { id: "ui-test", email: "admin@example.test", role: "ADMIN_HRD", employeeId: null, mustChangePassword: false } },
      }));
      await page.route(`**/api/v1/${master.resource}?*`, route => route.fulfill({
        json: { items: departments, total: departments.length, page: 1, pageSize: 20 },
      }));
      await page.goto(`http://127.0.0.1:15175/#${master.route}`);
      await expect(page.getByRole("heading", { name: master.title, level: 1 })).toBeVisible();
      await expect(page.getByRole("grid", { name: `Daftar ${master.label}` })).toBeVisible();
      await expect(page.getByRole("button", { name: "Nonaktifkan Keuangan" })).toBeInViewport({ ratio: 1 });
      await expect(page.getByText("1-4 dari 4")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      expect(await page.locator(".list-pager-range").evaluate(el => getComputedStyle(el).fontFamily)).not.toContain("Mono");
      expect(await page.locator(".status-filter").evaluate(el => getComputedStyle(el).borderTopStyle)).toBe("solid");
      await page.screenshot({ path: info.outputPath(`${master.resource}-${scheme}-${width}.png`), fullPage: true });
      await page.getByRole("button", { name: "Tambah", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Simpan" }).click();
      await expect(page.getByText("Nama minimal 2 karakter.")).toBeVisible();
      await page.screenshot({ path: info.outputPath(`${master.resource}-form-${scheme}-${width}.png`) });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
      expect(errors).toEqual([]);
    });
  }
}

}
