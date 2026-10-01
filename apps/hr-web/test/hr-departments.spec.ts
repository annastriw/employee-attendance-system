import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("HRD manages departments through the real Gateway, Employee Service and MySQL", async ({ page }, testInfo) => {
  const fixtures = JSON.parse(readFileSync(resolve("../../.local/hr-e2e-departments.json"), "utf8")) as
    { project: string; email: string; password: string; codePrefix: string }[];
  const fixture = fixtures.find((entry) => entry.project === testInfo.project.name)!;
  const name = `Departemen ${fixture.codePrefix}`;
  const code = `${fixture.codePrefix}-FIN`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ringkasan", exact: true })).toBeVisible();

  await page.goto("/#departemen");
  await expect(page.getByRole("heading", { name: "Departemen", level: 1 })).toBeVisible();

  // Create; the code is normalised to upper case by the client and the API.
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nama").fill(name);
  await dialog.getByLabel("Kode").fill(code.toLowerCase());
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("status")).toContainText(`${name} ditambahkan.`);
  await page.getByRole("searchbox", { name: "Cari departemen" }).fill(fixture.codePrefix);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Aktif");

  // A duplicate code is rejected by MySQL-backed uniqueness and shown on the field.
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await dialog.getByLabel("Nama").fill(`${name} Dua`);
  await dialog.getByLabel("Kode").fill(code);
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(dialog.getByText("Kode departemen sudah digunakan.")).toBeVisible();
  await dialog.getByRole("button", { name: "Batal" }).click();

  // Edit.
  await page.getByRole("button", { name: `Ubah ${name}` }).click();
  await dialog.getByLabel("Nama").fill(`${name} Pusat`);
  await dialog.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("status")).toContainText(`${name} Pusat diperbarui.`);

  // Deactivate only after confirmation; the row stays (no hard delete).
  await page.getByRole("button", { name: `Nonaktifkan ${name} Pusat` }).click();
  await expect(dialog).toContainText("Data dan riwayat tetap tersimpan");
  await dialog.getByRole("button", { name: "Nonaktifkan" }).click();
  await expect(page.getByRole("status")).toContainText("dinonaktifkan.");

  // Filters live in the URL and survive a reload.
  await page.getByRole("radio", { name: "Nonaktif" }).or(page.getByRole("button", { name: "Nonaktif", exact: true })).click();
  await expect(page).toHaveURL(/status=INACTIVE/);
  await page.reload();
  await expect(page.getByRole("row", { name: new RegExp(`${name} Pusat`) })).toContainText("Nonaktif");

  await page.getByRole("button", { name: `Aktifkan ${name} Pusat` }).click();
  await expect(page.getByRole("status")).toContainText("diaktifkan kembali.");
  await expect(page.getByRole("row", { name: new RegExp(`${name} Pusat`) })).toHaveCount(0);
  await expect(page.getByText("Tidak ada departemen yang cocok")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("departments.png"), fullPage: true });
  expect(errors).toEqual([]);
});
