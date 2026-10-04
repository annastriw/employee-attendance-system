import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("HRD: initial password change, login again, restore and logout through real API", async ({
  page,
}, testInfo) => {
  const fixtures = JSON.parse(
    readFileSync(resolve("../../.local/hr-e2e.json"), "utf8"),
  ) as { project: string; email: string; password: string }[];
  const fixture = fixtures.find(
    (entry) => entry.project === testInfo.project.name,
  )!;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Masuk" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
  });
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize(testInfo.project.use.viewport!);
  await page.getByLabel("Email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page
    .getByRole("button", { name: "Tampilkan password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Sembunyikan password", exact: true })
    .click();
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Buat password baru" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Buat password baru" }),
  ).toBeVisible();
  const newPassword = "Browser-Replacement-Test-123456";
  await page
    .getByLabel("Password saat ini", { exact: true })
    .fill(fixture.password);
  await page.getByLabel("Password baru", { exact: true }).fill(newPassword);
  await page
    .getByLabel("Konfirmasi password baru", { exact: true })
    .fill("Not-The-Same-123456");
  await page.getByRole("button", { name: "Simpan password" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Konfirmasi password belum sama.",
  );
  await page
    .getByLabel("Konfirmasi password baru", { exact: true })
    .fill(newPassword);
  await page.screenshot({
    path: testInfo.outputPath("change-password.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Simpan password" }).click();
  await expect(
    page.getByRole("heading", { name: "Masuk" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Password berhasil diperbarui",
  );
  await page.getByLabel("Email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ringkasan", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Ringkasan", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Belum ada data yang ditampilkan")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Menu akun" }).click();
  await page.getByRole("menuitem", { name: "Keluar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Masuk" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Masuk" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
