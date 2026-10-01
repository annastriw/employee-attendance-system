# Auth — kontrak database tahap fondasi
Acuan: ../requirements/baseline.md dan ../architecture/adr-002-project-tooling.md.

## Scope
Tiga tabel Auth: accounts, sessions, audit_logs. Login, bcrypt, JWT, seed HRD,
outbox, serta integrasi Employee merupakan task lanjutan.

## Struktur dan invariants
- ID UUID CHAR(36); DATETIME(3) UTC; InnoDB utf8mb4_unicode_ci.
- Email VARCHAR(254) unik termasuk akun arsip. Aplikasi melakukan trim/lowercase.
- employee_id unik opsional adalah ID logis lintas service tanpa FK ke Employee.
- Role ADMIN_HRD atau EMPLOYEE; status awal INACTIVE; restore tetap INACTIVE.
- Password hanya hash bcrypt VARCHAR(60); must_change_password default true.
- Session FK ke Account dengan RESTRICT; refresh_token_hash SHA-256 CHAR(64) unik.
- expires_at dan revoked_at digunakan pemeriksaan sesi setiap request.
- Audit actor/target UUID logis, action, reason, request_id, timestamp.
  Tidak ada kolom password/hash/token/signed URL atau payload bebas.
- Runtime Auth SELECT/INSERT/UPDATE accounts dan sessions; SELECT/INSERT audit.
- Runtime tanpa DDL, DELETE accounts, UPDATE audit, atau akses tabel migration.
- Satu admin ditegakkan alur seed idempotent pada task login, bukan unique role.

## Acceptance
Migration dev/test dapat diterapkan ulang tanpa perubahan.
Client membaca MySQL nyata; transaksi test memverifikasi email/token unik dan FK.
Transaksi di-rollback agar data uji tidak tertinggal.
Hak runtime diverifikasi lewat operasi yang harus ditolak.
Login dan seed diimplementasikan pada [spec Auth Service](auth-service.md).
