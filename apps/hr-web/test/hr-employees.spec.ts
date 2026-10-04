import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
interface Fixture { project: string; email: string; password: string; codePrefix: string; departmentName: string; positionName: string }
test('HRD creates employee with one-time credential and unique NIK on real API', async ({ page }, info) => {
  const fixtures = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../.local/hr-e2e-employees.json'),'utf8')) as Fixture[];
  const fixture = fixtures.find(row => row.project === info.project.name)!; const nik = fixture.codePrefix + '-001'; const email = fixture.codePrefix.toLowerCase() + '-employee@example.invalid';
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.getByLabel('Email',{exact:true}).fill(fixture.email);await page.getByLabel('Password',{exact:true}).fill(fixture.password);await page.getByRole('button',{name:'Masuk',exact:true}).click();await expect(page.getByRole('heading',{name:'Ringkasan',level:1})).toBeVisible();
  await page.goto('/#karyawan');await page.getByRole('button',{name:'Tambah',exact:true}).click();
  async function fill(suffix: string) {
    await page.getByLabel('NIK',{exact:true}).fill(nik);await page.getByLabel('Nama',{exact:true}).fill(fixture.codePrefix+' Karyawan');await page.getByLabel('Mulai bekerja',{exact:true}).fill('2026-10-02');await page.getByLabel('Email',{exact:true}).fill(suffix ? fixture.codePrefix.toLowerCase()+'-'+suffix+'@example.invalid' : email);
    for (const [label,name] of [['departemen',fixture.departmentName],['jabatan',fixture.positionName]]) { await page.getByRole('button',{name:'Pilih '+label,exact:true}).click();await page.getByRole('menuitemradio',{name,exact:true}).click(); }
  }
  await fill('');await page.getByRole('button',{name:'Buat karyawan',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  const password = await page.getByRole('textbox',{name:'Password sementara',exact:true}).inputValue();expect(password.length).toBeGreaterThanOrEqual(24);
  expect(await page.evaluate(secret => location.href.includes(secret) || JSON.stringify(localStorage).includes(secret) || JSON.stringify(sessionStorage).includes(secret),password)).toBe(false);
  await page.getByRole('button',{name:'Selesai',exact:true}).click();await expect(page.getByRole('textbox',{name:'Password sementara',exact:true})).toHaveCount(0);await expect(page.getByRole('row',{name:new RegExp(nik)})).toBeVisible();
  await page.reload();await expect(page.getByRole('row',{name:new RegExp(nik)})).toBeVisible();await expect(page.getByRole('textbox',{name:'Password sementara',exact:true})).toHaveCount(0);
  const login=await page.request.post('http://localhost:15300/api/v1/auth/employee/login',{data:{email,password}});expect(login.status()).toBe(200);expect((await login.json()).user).toMatchObject({role:'EMPLOYEE',mustChangePassword:true});
  await page.getByRole('button',{name:'Tambah',exact:true}).click();await fill('duplicate');await page.getByRole('button',{name:'Buat karyawan',exact:true}).click();await expect(page.getByText('NIK atau Idempotency-Key sudah digunakan.')).toBeVisible();await page.getByRole('button',{name:'Batal',exact:true}).click();
  await page.getByRole('searchbox',{name:'Cari karyawan'}).fill(nik);await expect(page).toHaveURL(new RegExp('search='+nik));await expect(page.getByRole('row',{name:new RegExp(nik)})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.screenshot({path:info.outputPath('hr-employees-real-'+info.project.name+'.png'),fullPage:true});expect(errors).toEqual([]);
});
