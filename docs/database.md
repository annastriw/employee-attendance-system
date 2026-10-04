# Database dan ERD

Sumber struktur: [schema Prisma](../prisma/schema.prisma) dan [migration SQL](../prisma/migrations/). MySQL 8.4 memakai InnoDB, utf8mb4, ID UUID CHAR(36), timestamp DATETIME(3) UTC, serta DATE untuk tanggal kerja WIB.

Ada **23 tabel domain**: 6 Auth, 8 Employee, 7 Attendance, 2 Media. `_prisma_migrations` adalah metadata migrasi, bukan tabel bisnis. Satu schema dikelola terpusat; runtime user berbeda hanya mengakses tabel service pemiliknya.

## Cara membaca ERD

Diagram berikut menunjukkan tabel yang benar-benar dimodelkan serta field penting. PK adalah primary key, FK adalah foreign key fisik dalam domain, UK adalah unique field tunggal. Nullability dan seluruh field/index ada di schema/migration. Relasi lintasservice ditampilkan terpisah sebagai referensi logis, bukan FK MySQL.

## Auth

```mermaid
erDiagram
    auth_accounts {
        string id PK
        string email UK
        string employee_id UK
        string password_hash
        enum role
        enum status
        boolean must_change_password
    }
    auth_sessions {
        string id PK
        string account_id FK
        string refresh_token_hash UK
    }
    auth_audit_logs {
        string id PK
        string actor_account_id
        string target_account_id
        string action
    }
    auth_provisioning {
        string id PK
        string account_id FK, UK
        string actor_account_id
        string payload_hash
        boolean finalized
        datetime credential_claimed_at
    }
    auth_email_changes {
        string id PK
        string account_id FK
        string actor_account_id
        string payload_hash
        string email
    }
    auth_password_resets {
        string id PK
        string account_id FK
        string actor_account_id
        string payload_hash
        datetime claimed_at
    }
    auth_accounts ||--o{ auth_sessions : owns
    auth_accounts ||--o| auth_provisioning : owns
    auth_accounts ||--o{ auth_email_changes : owns
    auth_accounts ||--o{ auth_password_resets : owns
```

## Employee

```mermaid
erDiagram
    emp_departments {
        string id PK
        string name
        string code UK
        enum status
    }
    emp_positions {
        string id PK
        string name
        string code UK
        enum status
    }
    emp_audit_logs {
        string id PK
        string actor_account_id
        string entity_type
        string entity_id
        string action
    }
    emp_employees {
        string id PK
        string nik UK
        string name
        string department_id FK
        string position_id FK
        date start_date
        enum status
        boolean ready
    }
    emp_provisioning {
        string id PK
        string employee_id FK, UK
        string actor_account_id
        string payload_hash
        string email
        enum status
        enum phase
        int attempts
        datetime next_attempt_at
    }
    emp_employee_history {
        string id PK
        string employee_id FK
        string actor_account_id
        string action
    }
    emp_email_changes {
        string id PK
        string employee_id FK
        string actor_account_id
        string email
        string payload_hash
        enum status
        int attempts
        datetime next_attempt_at
    }
    emp_lifecycle_changes {
        string id PK
        string employee_id FK
        string actor_account_id
        string payload_hash
        enum status
        int attempts
        datetime next_attempt_at
    }
    emp_departments ||--o{ emp_employees : owns
    emp_positions ||--o{ emp_employees : owns
    emp_employees ||--o| emp_provisioning : owns
    emp_employees ||--o{ emp_employee_history : owns
    emp_employees ||--o{ emp_email_changes : owns
    emp_employees ||--o{ emp_lifecycle_changes : owns
```

## Attendance

```mermaid
erDiagram
    att_work_policies {
        string id PK
        string name
        string work_days
        string check_in_time
        string check_out_time
        string cutoff_time
        string timezone
    }
    att_holidays {
        string id PK
        date holiday_date UK
        string description
    }
    att_daily_records {
        string id PK
        string employee_id
        date attendance_date
        datetime deleted_at
    }
    att_events {
        string id PK
        string daily_record_id FK
        enum event_type
        datetime event_time
        string photo_object_id UK
    }
    att_idempotency_requests {
        string id PK
        string employee_id
        string payload_hash
        enum state
        int response_status
    }
    att_audit_logs {
        string id PK
        string actor_account_id
        string action
        string entity_type
        string entity_id
    }
    att_outbox {
        string id PK
        string event_id UK
        string photo_object_id
        string owner_employee_id
        enum purpose
        string actor_account_id
        enum state
        int attempts
        datetime next_attempt_at
    }
    att_daily_records ||--o{ att_events : owns
```

## Media

```mermaid
erDiagram
    media_objects {
        string id PK
        string owner_employee_id
        string owner_account_id
        enum purpose
        enum status
        string checksum_sha256
        string bucket
        string object_key
        string bound_event_id UK
    }
    media_audit_logs {
        string id PK
        string actor_account_id
        string action
        string entity_id
    }
```

## Referensi logis lintasservice

```mermaid
flowchart LR
    Employee[emp_employees] -. employee_id .-> Auth[auth_accounts]
    Employee -. employee_id .-> Daily[att_daily_records]
    Employee -. owner_employee_id .-> Media[media_objects]
    Event[att_events] -. photo_object_id .-> Media
    Event -. event_id .-> Outbox[att_outbox]
    Event -. bound_event_id .-> Media
```

Panah menunjukkan ID yang dihubungkan oleh kontrak aplikasi, bukan arah foreign key atau akses langsung antarservice. Auth.employee_id unik/nullable membedakan akun HR tanpa profil karyawan. Attendance mengambil eligibility/profil dari Employee melalui HTTP, Media memvalidasi owner dan binding melalui API.

## Constraint dan riwayat

- Email akun, NIK, kode/nama departemen/jabatan unik; nilai milik profil arsip tetap dicadangkan.
- UNIQUE(employee_id, attendance_date) berlaku juga untuk soft-deleted record.
- UNIQUE(daily_record_id, event_type) membatasi satu CHECK_IN dan satu CHECK_OUT; UNIQUE(photo_object_id) mencegah reuse bukti event.
- Media: UNIQUE(owner_employee_id, idempotency_key), UNIQUE(bucket, object_key), dan bound_event_id unik.
- Snapshot departemen/jabatan di daily record dan policy_snapshot pada event menjaga riwayat dari perubahan konfigurasi kemudian.
- Holiday date unik. Kalender bukan foreign key event; hasil jadwal disalin ke snapshot saat presensi.
- Audit mencatat actor, action, requestId dan waktu. Runtime hanya SELECT/INSERT audit; tidak UPDATE/DELETE.
- Idempotency/provisioning/email/lifecycle/outbox menyimpan state, payload hash dan lease/retry untuk pemulihan operasi.

## Kepemilikan dan hak akses

| User runtime | Tabel | Batas |
| --- | --- | --- |
| attendance_auth | auth_* | SELECT/INSERT/UPDATE domain; audit SELECT/INSERT |
| attendance_employee | emp_* | SELECT/INSERT/UPDATE domain; history/audit SELECT/INSERT |
| attendance_attendance | att_* | Hak sesuai operasi presensi/kalender; audit SELECT/INSERT |
| attendance_media | media_* | SELECT/INSERT/UPDATE metadata; audit SELECT/INSERT |
| attendance_migrator | Database target | DDL/migration, bukan user runtime |

Daftar grant lengkap ada di [script setup](../scripts/database/setup-local.mjs). Tidak semua tabel mendapat hak seragam; misalnya kalender dapat dihapus sesuai aturan bisnis. Development/test memakai schema berbeda pada satu instance lokal. Production menggunakan database terpisah dari lokal.

## Migration dan koneksi

Prisma 7 menggunakan adapter PrismaMariaDb untuk berkomunikasi dengan **MySQL**; nama adapter tidak mengganti mesin DB menjadi MariaDB. Client dibangun di packages/database, tidak dibundel ke frontend. URL runtime berasal dari environment privat.

Migration SQL versioned dan urut; tidak menggunakan schema reset pada live. CLI migration memakai user migrator, kemudian grants runtime diperbarui bila tabel baru perlu akses. Backup dibuat sebelum migration live; rollback image tidak otomatis mengembalikan schema/data. [Setup lokal](getting-started.md), [deployment](deployment.md).
