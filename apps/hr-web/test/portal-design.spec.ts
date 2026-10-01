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
        const mark = Array.from(document.querySelectorAll(".brand-mark i")).find(element => element.getBoundingClientRect().height > 0);
        return { overflow: document.documentElement.scrollWidth > innerWidth, accent: style.getPropertyValue("--accent").trim(), scheme: style.colorScheme, markHeight: mark?.getBoundingClientRect().height };
      });
      expect(layout.overflow).toBe(false);
      expect(layout.accent).toBe("#245b49");
      expect(layout.scheme).toBe("light");
      expect(layout.markHeight).toBeGreaterThan(0);
      if (width < 768)
        await expect(page.locator(".auth-aside")).toBeHidden();
      else
        await expect(page.locator(".auth-aside")).toBeVisible();
      if (portal === "hr") {
        await page.keyboard.press("Tab");
        await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
        await expect(page.getByRole("button", { name: "Masuk", exact: true })).toBeEnabled();
      }
      else {
        await expect(page.getByText("Portal sedang disiapkan")).toBeVisible();
        await expect(page.getByText(/Login dan pencatatan absensi belum tersedia/)).toBeVisible();
      }
      await page.screenshot({ path: info.outputPath(portal + "-" + width + ".png"), fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}
