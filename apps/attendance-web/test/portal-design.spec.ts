import { expect, test } from "@playwright/test";

const title = {
  login: "Masuk",
  change: "Buat password baru",
  home: "Beranda",
  capture: "Foto check-in",
};

for (const state of ["login", "change", "home", "capture"] as const) {
  for (const scheme of ["light", "dark"] as const) {
    for (const width of [320, 1440]) {
      test(
        state + " " + scheme + " layout at " + width + "px",
        async ({ page }, info) => {
          const errors: string[] = [];
          page.on("pageerror", (error) => errors.push(error.message));
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: scheme });
          await page.route("**/api/v1/auth/refresh", (route) =>
            state === "login"
              ? route.fulfill({
                  status: 401,
                  contentType: "application/json",
                  body: "{}",
                })
              : route.fulfill({
                  json: {
                    accessToken: "visual-test-token",
                    expiresIn: 900,
                    user: {
                      id: "visual-account",
                      email: "employee@example.test",
                      employeeId: "visual-employee",
                      role: "EMPLOYEE",
                      mustChangePassword: state === "change",
                    },
                  },
                }),
          );

          await page.goto(state === "capture" ? "/#foto-checkin" : "/");
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(
            title[state],
          );
          await expect(page.locator(".auth-showcase")).toHaveCount(0);
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

          if (state === "login") {
            await page.keyboard.press("Tab");
            await expect(
              page.getByLabel("Email", { exact: true }),
            ).toBeFocused();
          } else if (state === "change") {
            await expect(
              page.getByLabel("Password saat ini", { exact: true }),
            ).toBeVisible();
            await expect(
              page.getByRole("button", { name: "Simpan password" }),
            ).toBeVisible();
          } else if (state === "capture") {
            await expect(
              page.getByRole("button", { name: "Buka kamera" }),
            ).toBeVisible();
            await page.keyboard.press("Tab");
            await expect(
              page.getByRole("button", { name: "Kembali ke beranda" }),
            ).toBeFocused();
          } else {
            await expect(page.getByText("employee@example.test")).toBeVisible();
            await expect(
              page.getByRole("button", { name: "Keluar" }),
            ).toBeVisible();
          }

          await page.screenshot({
            path: info.outputPath(state + "-" + scheme + "-" + width + ".png"),
            fullPage: true,
          });
          expect(errors).toEqual([]);
        },
      );
    }
  }
}
