# Deploy VPS otomatis dari main

Setelah setup satu kali ini selesai dan gate `VPS_AUTO_DEPLOY_ENABLED=true` aktif, alur rilisnya: PR `dev → main` lulus CI dan disetujui pengguna → merge → perubahan backend/database membangun lima backend dan image migrator → deploy backend VPS dari SHA merge; Vercel menerbitkan frontend dari `main`. Perubahan frontend saja hanya memicu deployment Vercel dan tidak menyentuh VPS. Push ke `dev` tidak menerbitkan production.

## Pengamanan dan batas perubahan

- Workflow hanya berjalan pada push ke `main`, menunggu seluruh image SHA rilis berhasil dibuat, lalu memakai GitHub Environment `production`.
- Kunci SSH deploy dipaksa ke satu command dengan SHA commit dan flag migration. Kunci tidak mendapat shell interaktif atau akses Docker; sudo hanya mengizinkan satu script root-owned. Script memverifikasi melalui GitHub API bahwa SHA rilis adalah ancestor branch `main`; bila verifikasi gagal atau GitHub tidak bisa dihubungi, deployment berhenti.
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
sudo install -o root -g root -m 0755 infra/vps/attendance-release-verifier.py /usr/local/sbin/attendance-release-verifier
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
sudo chmod 0644 /var/lib/attendance-deploy/.ssh/authorized_keys
```

`authorized_keys` berisi public key dan forced-command options saja. Mode `0644` membuatnya dapat dibaca saat `sshd` memeriksa key, tetapi tetap tidak dapat ditulis oleh akun deploy; private key tetap rahasia di komputer lokal/GitHub Environment.

Tambahkan aturan sudo terbatas dan validasi sintaksnya:

```bash
echo 'attendance-deploy ALL=(root) NOPASSWD: /usr/local/sbin/attendance-deploy *' | sudo tee /etc/sudoers.d/attendance-deploy >/dev/null
sudo chmod 0440 /etc/sudoers.d/attendance-deploy
sudo visudo -cf /etc/sudoers.d/attendance-deploy
sudo bash -n /usr/local/sbin/attendance-deploy
sudo python3 -m py_compile /usr/local/sbin/attendance-deploy-ssh
sudo python3 -m py_compile /usr/local/sbin/attendance-release-verifier
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

Jangan aktifkan gate sampai perubahan verifier ini merged ke `main` dan file root-owned `/usr/local/sbin/attendance-deploy` serta `/usr/local/sbin/attendance-release-verifier` sudah diperbarui dari source `main` pada VPS. Untuk update setup satu kali setelah merge:

```bash
git -C /opt/attendance/releases/auto-deploy-setup pull --ff-only origin main
sudo install -o root -g root -m 0755 /opt/attendance/releases/auto-deploy-setup/scripts/deployment/attendance-deploy.sh /usr/local/sbin/attendance-deploy
sudo install -o root -g root -m 0755 /opt/attendance/releases/auto-deploy-setup/infra/vps/attendance-release-verifier.py /usr/local/sbin/attendance-release-verifier
sudo bash -n /usr/local/sbin/attendance-deploy
sudo python3 -m py_compile /usr/local/sbin/attendance-release-verifier
```

Setelah itu pastikan environment secrets lengkap, migrator password file `.secrets/migrator.env` ada di VPS, lima backend sehat, dan Compose rilis aktif menunjuk SHA yang benar. Gate tetap berupa repository variable `VPS_AUTO_DEPLOY_ENABLED=true` di **Settings → Secrets and variables → Actions → Variables**; menambahkan environment secrets saja tidak memicu deploy.

## Alur harian

1. Coding dan push ke `dev`; unit test terdampak wajib, integrasi cepat bila perlu.
2. Periksa UI/alur secara manual. Setelah siap, buat PR `dev → main` dan tunggu CI.
3. Setelah merge yang diinstruksikan, Actions membangun image dan deploy VPS; Vercel deploy frontend dari `main`.
4. Untuk rilis backend, periksa workflow **Production images** sampai `Deploy VPS production` selesai, lalu buka `https://attendance-api.annastriwidagdo.me/health` dan cocokkan properti `release` dengan SHA merge `main`. Perubahan frontend saja diperiksa melalui deployment Vercel dan tidak memicu VPS. Jika gagal, baca log sebelum mengulang; image aplikasi otomatis kembali ke SHA sebelumnya untuk kegagalan health, tetapi migration perlu penanganan database terpisah.

Perubahan ini tidak mengaktifkan workflow sampai secret, akses forced-command, environment dan repository variable disiapkan. Lihat [alur CI/CD](../development/ci-cd-workflow.md).
