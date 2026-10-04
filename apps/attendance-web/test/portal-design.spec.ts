import { expect, test } from "@playwright/test";

const title = {
  login: "Masuk",
  change: "Buat password baru",
  home: "Hari ini",
  capture: "Foto check-in",
  checkout: "Foto checkout",
  ready: "Hari ini",
  completed: "Hari ini",
};

for (const state of [
  "login",
  "change",
  "home",
  "capture",
  "checkout",
  "ready",
  "completed",
] as const) {
  for (const scheme of ["light", "dark"] as const) {
    for (const width of [320, 1440]) {
      test(
        (["checkout", "ready", "completed"].includes(state)
          ? "T22 "
          : state === "home"
            ? "T24 "
            : "") +
          state +
          " " +
          scheme +
          " layout at " +
          width +
          "px",
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

          await page.route("**/api/v1/me/attendance/today", (route) =>
            route.fulfill({
              json: {
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
                  checkoutReasonRequired:
                    state === "checkout" || state === "ready",
                  status:
                    state === "completed"
                      ? "CHECKED_OUT"
                      : state === "checkout" || state === "ready"
                        ? "CHECKED_IN"
                        : "NOT_CHECKED_IN",
                  record: ["checkout", "ready", "completed"].includes(state)
                    ? {
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
                        checkOut:
                          state === "completed"
                            ? {
                                id: "554d6a1b-2f3b-44a8-9a87-7a2d4d8bb8f0",
                                eventTime: "2026-10-02T17:00:00.000+07:00",
                                isEarlyDeparture: false,
                                isOutsideSchedule: false,
                                reason: null,
                              }
                            : null,
                      }
                    : null,
                },
                meta: {
                  requestId: "visual",
                  serverTime: "2026-10-02T07:00:00.000+07:00",
                },
              },
            }),
          );
          await page.goto(
            state === "capture"
              ? "/#foto-checkin"
              : state === "checkout"
                ? "/#foto-checkout"
                : "/",
          );
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
          } else if (state === "capture" || state === "checkout") {
            await expect(
              page.getByRole("button", { name: "Buka kamera" }),
            ).toBeVisible();
            await page.keyboard.press("Tab");
            await expect(
              page.getByRole("button", { name: "Kembali ke beranda" }),
            ).toBeFocused();
          } else {
            await expect(page.getByText("Synthetic Employee")).toBeVisible();
            for (const button of await page.locator(".today-action").all()) {
              const bounds = await button.boundingBox();
              expect(bounds?.height).toBeGreaterThanOrEqual(44);
            }
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

// Personal history visual states; real business acceptance remains manual.
const historyId = "11111111-1111-4111-8111-111111111111";
const historyIn = "22222222-2222-4222-8222-222222222222";
const historyOut = "33333333-3333-4333-8333-333333333333";
const historyRecord = {
  id: historyId,
  attendanceDate: "2026-10-02",
  department: "Keuangan",
  position: "Analis",
  deletedAt: null,
  deleteReason: null,
  checkIn: {
    id: historyIn,
    eventTime: "2026-10-02T08:02:00.000+07:00",
    reason: "Koneksi internet terputus.",
    isLate: true,
    isEarlyDeparture: false,
    isOutsideSchedule: false,
    captureMethod: "AUTO",
    location: {
      latitude: -6.2,
      longitude: 106.8,
      accuracyMeters: 25,
      capturedAt: "2026-10-02T08:01:50.000+07:00",
    },
  },
  checkOut: {
    id: historyOut,
    eventTime: "2026-10-02T16:45:00.000+07:00",
    reason: "Keperluan keluarga.",
    isLate: false,
    isEarlyDeparture: true,
    isOutsideSchedule: false,
    captureMethod: "MANUAL",
    location: {
      latitude: -6.201,
      longitude: 106.801,
      accuracyMeters: 30,
      capturedAt: "2026-10-02T16:44:50.000+07:00",
    },
  },
};
const historyMeta = {
  requestId: historyId,
  serverTime: "2026-10-03T08:00:00.000+07:00",
};
for (const scheme of ["light", "dark"] as const)
  for (const width of [320, 1440])
    for (const state of ["list", "detail", "deleted"] as const) {
      test(
        "T24 history " + state + " " + scheme + " " + width,
        async ({ page }, info) => {
          const errors: string[] = [];
          page.on("pageerror", (e) => errors.push(e.message));
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: scheme });
          await page.route("**/api/v1/auth/refresh", (route) =>
            route.fulfill({
              json: {
                accessToken: "visual-only",
                expiresIn: 900,
                user: {
                  id: "visual-account",
                  employeeId: "visual-profile",
                  email: "employee@example.test",
                  role: "EMPLOYEE",
                  mustChangePassword: false,
                },
              },
            }),
          );
          const record =
            state === "deleted"
              ? {
                  ...historyRecord,
                  deletedAt: "2026-10-03T08:00:00.000+07:00",
                  deleteReason: "Bukti perlu diperiksa.",
                }
              : historyRecord;
          await page.route("**/api/v1/me/attendance?*", (route) =>
            route.fulfill({
              json: {
                data: [record],
                meta: { ...historyMeta, total: 1, page: 1, pageSize: 20 },
              },
            }),
          );
          await page.route("**/api/v1/me/attendance/" + historyId, (route) =>
            route.fulfill({ json: { data: record, meta: historyMeta } }),
          );
          await page.route(
            "**/api/v1/me/attendance/" + historyId + "/events/*/photo",
            (route) =>
              route.fulfill({
                json: {
                  data: {
                    url: "http://127.0.0.1:15173/t24-photo.png",
                    expiresInSeconds: 60,
                  },
                  meta: historyMeta,
                },
              }),
          );
          await page.route("**/t24-photo.png", (route) =>
            route.fulfill({
              contentType: "image/png",
              body: Buffer.from(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1ioAAAAASUVORK5CYII=",
                "base64",
              ),
            }),
          );
          await page.goto(
            "/#riwayat" + (state === "list" ? "" : "?id=" + historyId),
          );
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(
            state === "list" ? "Riwayat" : "Detail absensi",
          );
          if (state === "list")
            await expect(
              page.getByRole("button", { name: "Buka absensi 2 Okt 2026" }),
            ).toBeVisible();
          else if (state === "deleted") {
            await expect(
              page.getByText("Bukti perlu diperiksa."),
            ).toBeVisible();
            await expect(
              page.getByRole("button", { name: /Lihat foto/ }),
            ).toHaveCount(0);
            await expect(page.locator("img")).toHaveCount(0);
          } else {
            await page
              .getByRole("button", { name: "Lihat foto check-in", exact: true })
              .click();
            await expect(
              page.getByRole("img", { name: "Foto check-in 2 Okt 2026" }),
            ).toBeVisible();
          }
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
          ).toBe(false);
          const actions = await page.locator(".history-page button").all();
          for (const button of actions)
            if (await button.isVisible())
              expect(
                (await button.boundingBox())?.height ?? 0,
              ).toBeGreaterThanOrEqual(43.99);
          await page.screenshot({
            path: info.outputPath(
              "t24-" + state + "-" + scheme + "-" + width + ".png",
            ),
            fullPage: true,
          });
          expect(errors).toEqual([]);
        },
      );
    }
