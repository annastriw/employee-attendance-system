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

for (const scheme of ['light', 'dark'] as const) for (const width of [320, 768, 1024, 1440]) {
  test('HR employees ' + scheme + ' layout at ' + width + 'px', async ({ page }, info) => {
    const errors: string[] = []; page.on('pageerror',error=>errors.push(error.message)); await page.emulateMedia({colorScheme:scheme}); await page.setViewportSize({width,height:900});
    const id='11111111-1111-4111-8111-111111111111';
    await page.route('**/api/v1/auth/refresh',route=>route.fulfill({json:{accessToken:'ui-test-session',expiresIn:3600,user:{id:'ui-test',email:'admin@example.test',role:'ADMIN_HRD',employeeId:null,mustChangePassword:false}}}));
    await page.route('**/api/v1/employees?*',route=>route.fulfill({json:{items:[{id,nik:'EMP-2026-001',name:'Karyawan Operasional Regional',email:'employee@example.test',department:'Operasional',position:'Analis',status:'ACTIVE'}],total:1,page:1,pageSize:20}}));
    for (const resource of ['departments','positions']) await page.route('**/api/v1/'+resource+'?*',route=>route.fulfill({json:{items:[{id,name:'Operasional',code:'OPS',status:'ACTIVE',createdAt:'',updatedAt:''}],total:1,page:1,pageSize:100}}));
    await page.route('**/api/v1/employee-provisioning/'+id,route=>route.fulfill({json:{id,employeeId:id,email:'employee@example.test',status:'COMPLETED',errorCode:null}}));
    await page.route('**/api/v1/employee-provisioning/'+id+'/credentials',route=>route.fulfill({json:{email:'employee@example.test',temporaryPassword:'Visual-Dummy-Password-123'}}));
    await page.goto('http://127.0.0.1:15175/#karyawan');await expect(page.getByRole('grid',{name:'Daftar karyawan'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:info.outputPath('employees-'+scheme+'-'+width+'.png'),fullPage:true});
    await page.getByRole('button',{name:'Tambah',exact:true}).click();await expect(page.getByRole('form',{name:'Tambah karyawan'})).toBeVisible();await expect(page.getByLabel('Email',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await page.screenshot({path:info.outputPath('employee-form-'+scheme+'-'+width+'.png'),fullPage:true});
    await page.getByRole('button',{name:'Batal',exact:true}).click();await page.goto('http://127.0.0.1:15175/#karyawan?operation='+id);await page.getByRole('button',{name:'Tampilkan password'}).click();await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('button',{name:'Selesai',exact:true})).toBeInViewport({ratio:1});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:info.outputPath('temporary-password-'+scheme+'-'+width+'.png'),fullPage:true});await page.keyboard.press('Escape');await expect(page.getByLabel('Password sementara',{exact:true})).toHaveCount(0);
    const failedId='22222222-2222-4222-8222-222222222222';await page.route('**/api/v1/employee-provisioning/'+failedId,route=>route.fulfill({json:{id:failedId,employeeId:failedId,email:'used@example.test',status:'FAILED',errorCode:'EMAIL_CONFLICT',canCorrectEmail:true}}));
    await page.goto('http://127.0.0.1:15175/#karyawan?operation='+failedId);await expect(page.getByLabel('Email pengganti',{exact:true})).toBeVisible();await expect(page.getByText('Karyawan berhasil dibuat. Password sementara telah ditutup.')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    await page.screenshot({path:info.outputPath('employee-email-recovery-'+scheme+'-'+width+'.png'),fullPage:true});expect(errors).toEqual([]);
  });
}

for (const scheme of ["light", "dark"] as const) {
  for (const width of [320, 1440]) {
    test("HR employee edit " + scheme + " at " + width + "px", async ({ page }, info) => {
      const id = "11111111-1111-4111-8111-111111111111";
      const department = { id, name: "Operasional", code: "OPS", status: "INACTIVE", createdAt: "", updatedAt: "" };
      const position = { ...department, id: "22222222-2222-4222-8222-222222222222", name: "Analis", code: "ANA", status: "ACTIVE" };
      const employee = { id, nik: "EMP-EDIT", name: "Karyawan Operasional Regional Timur", phone: null, email: "employee@example.test", departmentId: id, positionId: position.id, startDate: "2026-10-02", status: "ACTIVE", updatedAt: "2026-10-02T12:00:00.000Z", emailChange: null };
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: scheme });
      await page.route("**/api/v1/**", route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith("/auth/refresh")) return route.fulfill({ json: { accessToken: "visual-token", expiresIn: 3600, user: { id: "visual-admin", email: "admin@example.test", role: "ADMIN_HRD", mustChangePassword: false } } });
        if (path.endsWith("/departments")) return route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 100 } });
        if (path.endsWith("/positions")) return route.fulfill({ json: { items: [position], total: 1, page: 1, pageSize: 100 } });
        if (path.includes("/history")) return route.fulfill({ json: { items: [{ id: "hist-1", action: "EMPLOYEE_LIFECYCLE_ACTIVE", before: { status: "INACTIVE" }, after: { status: "ACTIVE" }, actorAccountId: "act", createdAt: "2026-10-02T10:00:00.000Z" }], total: 1, page: 1, pageSize: 10 } });
        if (path.endsWith("/employees/" + id)) return route.fulfill({ json: { ...employee, department, position, archivedAt: null, emailChange: null, lifecycleChange: null, hasPendingOperation: false } });
        if (path.endsWith("/employees")) return route.fulfill({ json: { items: [{ ...employee, department: department.name, position: position.name }], total: 1, page: 1, pageSize: 20 } });
        return route.fulfill({ status: 404, json: { message: "Unexpected visual request" } });
      });
      await page.goto("http://127.0.0.1:15175/#karyawan");
      await page.getByRole("button", { name: "Buka " + employee.name }).click();
      await expect(page.getByRole("heading", { name: "Profil karyawan" })).toBeVisible();
      await expect(page.getByLabel("Nama", { exact: true })).toHaveValue(employee.name);
      await expect(page.getByText(/Nilai lama tetap tersimpan/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: info.outputPath("employee-edit-" + scheme + "-" + width + ".png"), animations: "disabled", fullPage: true });
      await page.getByRole("button", { name: "Reset password", exact: true }).click();
      const resetDialog = page.getByRole("dialog");
      await expect(resetDialog).toBeVisible();
      await expect(resetDialog.getByRole("button", { name: "Reset password", exact: true })).toBeVisible();
      await expect(resetDialog.getByText(/Semua sesi karyawan akan dicabut seketika/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: info.outputPath("reset-confirm-" + scheme + "-" + width + ".png"), animations: "disabled", fullPage: true });
      await resetDialog.getByRole("button", { name: "Batal", exact: true }).click();
      await expect(resetDialog).toBeHidden();
      await page.getByRole("button", { name: "Nonaktifkan", exact: true }).click();
      const lifecycleDialog = page.getByRole("dialog");
      await expect(lifecycleDialog).toBeVisible();
      await expect(lifecycleDialog.getByRole("button", { name: "Nonaktifkan", exact: true })).toBeVisible();
      await expect(lifecycleDialog.getByText(/Semua sesi karyawan akan dicabut/)).toBeVisible();
      await page.screenshot({ path: info.outputPath("lifecycle-confirm-" + scheme + "-" + width + ".png"), animations: "disabled", fullPage: true });
      await lifecycleDialog.getByRole("button", { name: "Batal", exact: true }).click();
      await expect(lifecycleDialog).toBeHidden();
      await page.getByLabel("Email baru").fill("updated@example.test");
      await page.getByRole("button", { name: "Ubah email", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Ubah email", exact: true })).toBeVisible();
      await expect(dialog.getByText(/Semua sesi karyawan akan dicabut/)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      await page.screenshot({ path: info.outputPath("email-confirm-" + scheme + "-" + width + ".png"), animations: "disabled", fullPage: true });
      expect(errors).toEqual([]);
    });
  }
}
// T23 visual states only: business E2E remains manual during development.
const attendanceFixture = {
 id: '11111111-1111-4111-8111-111111111111', employeeId: '22222222-2222-4222-8222-222222222222',
 employee: { id: '22222222-2222-4222-8222-222222222222', name: 'Sari Wijaya', status: 'ARCHIVED' },
 attendanceDate: '2026-10-02', version: '2026-10-03T00:00:00.000Z',
 department: 'Keuangan', position: 'Analis', deletedAt: null, deleteReason: null, deletedByAccountId: null,
 checkIn: { id: 'in', eventTime: '2026-10-02T08:02:00.000+07:00', reason: 'Koneksi internet terputus.', isLate: true, isEarlyDeparture: false, isOutsideSchedule: false },
 checkOut: { id: 'out', eventTime: '2026-10-02T16:45:00.000+07:00', reason: 'Keperluan keluarga.', isLate: false, isEarlyDeparture: true, isOutsideSchedule: false },
 history: [],
};
for (const scheme of ['light', 'dark'] as const) for (const width of [320, 1440]) for (const state of ['list', 'delete', 'restore']) {
 test('T23 ' + state + ' ' + scheme + ' ' + width, async ({ page }, info) => {
   const errors: string[] = [];
   page.on('pageerror', e => errors.push(e.message));
   await page.emulateMedia({ colorScheme: scheme });
   await page.setViewportSize({ width, height: 900 });
   await page.route('**/api/v1/auth/refresh', route => route.fulfill({ json: {
     accessToken: 'visual-test-only', expiresIn: 3600, user: { id: 'test', email: 'admin@example.test', role: 'ADMIN_HRD', employeeId: null, mustChangePassword: false },
   } }));
   const record = state === 'restore' ? { ...attendanceFixture,
     deletedAt: '2026-10-03T08:00:00.000+07:00', deleteReason: 'Bukti perlu diperiksa.', deletedByAccountId: 'admin',
     history: [{ id: 'audit', action: 'ATTENDANCE_DELETED', actorAccountId: 'admin', occurredAt: '2026-10-03T08:00:00.000+07:00', reason: 'Bukti perlu diperiksa.' }],
   } : attendanceFixture;
   await page.route('**/api/v1/attendance?*', route => route.fulfill({ json: { data: [record], meta: { total: 1, page: 1, pageSize: 20 } } }));
   await page.route('**/api/v1/attendance/**', route => route.fulfill({ json: { data: record } }));
   const view = state === 'restore' ? 'absensi-dihapus' : 'absensi';
   await page.goto('http://127.0.0.1:15175/#' + view + (state === 'list' ? '' : '?id=' + record.id));
   if (state === 'list') await expect(page.getByRole('grid', { name: 'Daftar absensi' })).toBeVisible();
   else {
     await expect(page.getByText('Sari Wijaya', { exact: true })).toBeVisible();
     await page.screenshot({ path: info.outputPath('detail-' + state + '-' + scheme + '-' + width + '.png'), fullPage: true });
     await page.getByRole('button', { name: state === 'restore' ? 'Pulihkan absensi' : 'Hapus absensi', exact: true }).click();
     await expect(page.getByRole('dialog')).toBeVisible();
     if (state === 'delete') {
       await page.getByLabel('Alasan penghapusan').fill('Bukti perlu diperiksa.');
       await expect(page.getByLabel('Alasan penghapusan')).toBeFocused();
     }
   }
   expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
   const scope = state === 'list' ? page.locator('.attendance-page') : page.getByRole('dialog');
   const buttons = await scope.getByRole('button').all();
   for (const button of buttons) {
     if (!(await button.isVisible()) || await button.isDisabled()) continue;
     const box = await button.boundingBox();
     // Clear/search primitives and name links may be smaller; consequential actions are >=44 px.
     if (['Terapkan', 'Hapus satu hari', 'Pulihkan', 'Batal'].includes((await button.innerText()).trim())) expect(box?.height).toBeGreaterThanOrEqual(44);
   }
   await page.screenshot({ path: info.outputPath('t23-' + state + '-' + scheme + '-' + width + '.png'), fullPage: true });
   expect(errors).toEqual([]);
 });
}
