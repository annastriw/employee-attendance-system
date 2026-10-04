# SDD — Auth dan sesi

## Scope dan kontrak

Auth memiliki akun, sesi, password dan operasi internal akun. Role HR adalah ADMIN_HRD, karyawan EMPLOYEE. Email normalisasi unik termasuk akun arsip; akun HR tidak membutuhkan employeeId.

Login `/auth/admin/login` dan `/auth/employee/login` terpisah; role salah ditolak. `/auth/me`, `/auth/refresh`, `/auth/change-password`, `/auth/logout` melengkapi siklus sesi. [Payload/metode](../api.md).

Access JWT berlaku 900 detik. Refresh maksimal 7 hari sejak login, dirotasi setiap pemakaian; DB menyimpan hash refresh. Cookie HttpOnly, SameSite Lax, Secure/prefix __Host- pada production. Frontend menyimpan access token dalam memori dan mengirim cookie dengan credentials include.

Password bcrypt cost 12; password baru minimum 12 karakter, maksimum 72 byte UTF-8. mustChangePassword membatasi sesi ke operasi akun sebelum password diganti. Pergantian/reset mencabut sesi dan meminta login ulang. Status sesi/akun diperiksa server, sehingga JWT lama tidak menghindari revokasi.

## State dan keamanan

ACTIVE dapat login; INACTIVE/ARCHIVED ditolak. Origin allowlist dan rate limit melindungi login/refresh; pemeriksaan `/auth/me` memakai limit terpisah. Tidak ada wildcard CORS dengan cookie.

Seed HR membuat satu admin awal. Pengulangan tidak mengganti password/status akun existing. Password demo README merupakan keputusan penggunaan lingkungan live, bukan secret default seed lokal atau infra.

## Integrasi dan data

Employee memanggil endpoint internal bertanda tangan untuk prepare/finalize, email/status dan reset. Receipt password sementara dienkripsi dengan key terpisah dari secret service dan diklaim sekali. Gateway tidak membuka path internal. Operation ID/key dengan payload berbeda ditolak.

Auth hanya mengakses auth_*. employeeId merupakan referensi logis. [ERD](../database.md#auth), [pemulihan](recovery.md).

## Source dan verifikasi

[Source Auth](../../apps/auth-service/src/), [integration tests](../../apps/auth-service/test/), [Gateway](../../apps/api-gateway/src/). Skenario penting: role/password salah, sesi expired/revoked, refresh rotasi, Origin ditolak, restricted session, reset/lifecycle membatalkan token.

Unit untuk logika berubah; integrasi cepat saat koneksi DB/cookie/kontrak berubah. Login/ganti password/logout UI diperiksa manual. Health tidak membuktikan seluruh skenario. [Testing](../testing/workflow.md).
