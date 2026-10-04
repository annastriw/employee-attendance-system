# Deploy VPS otomatis dari main

Setelah setup satu kali ini selesai, alur rilisnya: PR `dev → main` lulus CI dan disetujui pengguna → merge → perubahan backend/database membangun lima backend dan image migrator → deploy backend VPS dari SHA merge; Vercel menerbitkan frontend dari `main`. Perubahan frontend saja hanya memicu deployment Vercel dan tidak menyentuh VPS. Push ke `dev` tidak menerbitkan production. Deploy VPS dapat dibiarkan nonaktif sampai semua tahap setup selesai.

## Pengamanan dan batas perubahan

- Workflow hanya berjalan pada push ke `main`, menunggu seluruh image SHA rilis berhasil dibuat, lalu memakai GitHub Environment `production`.
- Kunci SSH deploy dipaksa ke satu command dengan SHA commit dan flag migration. Kunci tidak mendapat shell interaktif atau akses Docker; sudo hanya mengizinkan satu script root-owned.
- Deploy mengunci proses agar dua rilis tidak berjalan bersamaan, backup database sebelum migration, menjalankan `prisma migrate deploy` hanya jika folder migration berubah, memperbarui Compose ke SHA persis, lalu menunggu lima health endpoint.
- Jika health aplikasi gagal, script mengembalikan versi image aplikasi sebelumnya. Perubahan skema/data tidak di-rollback otomatis. Migration production harus kompatibel ke belakang (expand/contract); backup dipertahankan untuk pemulihan manual.
- Tidak ada suite test yang dijalankan ulang di VPS. Log workflow menyimpan SHA dan hasil health.

## Setup satu kali

Lakukan setelah perubahan workflow ini sudah berada di `main`. Pertahankan sesi SSH administrator tetap terbuka sampai uji koneksi selesai. Jangan mengirim private key atau nilai secret lewat chat.

### 1. Buat kunci khusus di komputer lokal

Di PowerShell:

```powershell
ssh-keygen -t ed25519 -C "attendance-github-deploy" -f "$env:USERPROFILE\.ssh\attendance-github-deploy"
```

Saat diminta passphrase, tekan Enter dua kali agar GitHub Actions dapat menggunakannya tanpa prompt. Jaga file tanpa `.pub` sebagai private key. Tampilkan public key untuk langkah VPS:

```powershell
Get-Content "$env:USERPROFILE\.ssh\attendance-github-deploy.pub"
```

### 2. Pasang command deploy terbatas pada VPS

Masuk SSH sebagai `ubuntu`. Ambil source `main` ke folder baru (jangan menimpa folder yang sudah ada), kemudian jalankan:

```bash
cd /opt/attendance/releases
git clone --branch main --single-branch https://github.com/annastriw/employee-attendance-system.git auto-deploy-setup
cd /opt/attendance/releases/auto-deploy-setup
sudo install -o root -g root -m 0755 scripts/deployment/attendance-deploy.sh /usr/local/sbin/attendance-deploy
sudo install -o root -g root -m 0755 infra/vps/attendance-deploy-ssh.py /usr/local/sbin/attendance-deploy-ssh
```

Buat akun khusus dan direktori kunci:

```bash
sudo useradd --create-home --home-dir /var/lib/attendance-deploy --shell /bin/bash attendance-deploy
sudo passwd --lock attendance-deploy
sudo chown root:root /var/lib/attendance-deploy
sudo chmod 0755 /var/lib/attendance-deploy
sudo install -d -o root -g root -m 0755 /var/lib/attendance-deploy/.ssh
```

Masukkan public key dari langkah 1. Perintah meminta satu baris public key dan memasangnya sebagai forced-command key:

```bash
read -r -p 'Paste public key: ' DEPLOY_PUBLIC_KEY
case "$DEPLOY_PUBLIC_KEY" in ssh-ed25519\ *) ;; *) echo 'STOP: expected an ssh-ed25519 public key'; unset DEPLOY_PUBLIC_KEY; exit 1 ;; esac
printf 'restrict,command="/usr/local/sbin/attendance-deploy-ssh" %s\n' "$DEPLOY_PUBLIC_KEY" | sudo tee /var/lib/attendance-deploy/.ssh/authorized_keys >/dev/null
unset DEPLOY_PUBLIC_KEY
sudo chown root:root /var/lib/attendance-deploy/.ssh/authorized_keys
sudo chmod 0600 /var/lib/attendance-deploy/.ssh/authorized_keys
```

Tambahkan aturan sudo terbatas dan validasi sintaksnya:

```bash
echo 'attendance-deploy ALL=(root) NOPASSWD: /usr/local/sbin/attendance-deploy *' | sudo tee /etc/sudoers.d/attendance-deploy >/dev/null
sudo chmod 0440 /etc/sudoers.d/attendance-deploy
sudo visudo -cf /etc/sudoers.d/attendance-deploy
sudo bash -n /usr/local/sbin/attendance-deploy
sudo python3 -m py_compile /usr/local/sbin/attendance-deploy-ssh
```

Ambil host key VPS secara terverifikasi dari sesi SSH yang sudah dipercaya, bukan dengan menerima fingerprint tanpa pemeriksaan. Di sesi VPS:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Simpan fingerprint untuk dibandingkan dengan fingerprint yang ditampilkan pada koneksi dari komputer lokal. Setelah cocok, pada komputer lokal jalankan `ssh-keyscan -t ed25519 43.157.243.37` dan simpan satu baris hasil sebagai secret `VPS_DEPLOY_KNOWN_HOSTS`. Jangan gunakan `StrictHostKeyChecking=no`.

### 3. Tambahkan secret dan aktifkan deploy

Di GitHub repository → **Settings → Environments**, buat environment `production` dan batasi deployment branch ke `main`. Tambahkan environment secrets:

- `VPS_DEPLOY_HOST`: alamat IP publik VPS.
- `VPS_DEPLOY_USER`: `attendance-deploy`.
- `VPS_DEPLOY_PRIVATE_KEY`: seluruh isi private key lokal tanpa `.pub`.
- `VPS_DEPLOY_KNOWN_HOSTS`: baris host key yang fingerprint-nya telah dicocokkan.

Sebelum keluar dari sesi ubuntu, ambil SHA yang sedang aktif: `sed -n 's/^BACKEND_RELEASE_SHA=//p' /opt/attendance/backend-release.env`. Dari komputer lokal, uji restricted key dengan `ssh -i "$env:USERPROFILE\.ssh\attendance-github-deploy" -o IdentitiesOnly=yes attendance-deploy@43.157.243.37 "deploy SHA_AKTIF false"`; ganti placeholder dengan nilai SHA tadi. Jawaban harus menyebut release sudah aktif. Setelah itu, di **Settings → Secrets and variables → Actions → Variables**, tambahkan `VPS_AUTO_DEPLOY_ENABLED` dengan nilai `true`. Sebelum diaktifkan, pastikan environment secrets lengkap, migrator password file `.secrets/migrator.env` ada di VPS, lima backend sehat, dan Compose rilis aktif menunjuk SHA yang benar.

## Alur harian

1. Coding dan push ke `dev`; unit test terdampak wajib, integrasi cepat bila perlu.
2. Periksa UI/alur secara manual. Setelah siap, buat PR `dev → main` dan tunggu CI.
3. Setelah merge yang diinstruksikan, Actions membangun image dan deploy VPS; Vercel deploy frontend dari `main`.
4. Periksa status workflow **Production images** dan buka frontend live untuk pemeriksaan manual. Jika gagal, jangan ulang deploy membabi buta; baca log. App image otomatis kembali ke SHA sebelumnya untuk kegagalan health, tetapi migration perlu penanganan database terpisah.

Perubahan ini tidak mengaktifkan workflow sampai secret, akses forced-command, environment dan repository variable disiapkan. Lihat [alur CI/CD](../development/ci-cd-workflow.md).
