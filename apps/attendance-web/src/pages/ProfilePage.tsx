import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { SignOut } from "@phosphor-icons/react";
import { ChangePasswordForm, PageHeader, Notice, Skeleton, UnderlineTabs } from "@attendance/ui";
import type { AuthClient, EmployeeUser } from "../lib/auth-client";

interface ProfileData { name: string; nik: string; email: string; phone: string | null; department: string; position: string; startDate: string; status: string; }
interface ProfileResponse { data: ProfileData | null; }
function validProfile(value: unknown): value is ProfileData {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ProfileData>;
  return [row.name, row.nik, row.email, row.department, row.position, row.status].every(item => typeof item === "string") &&
    (row.phone === null || typeof row.phone === "string") && typeof row.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.startDate);
}

export function ProfilePage({ client, user, busy, error, onHome, onLogout, onChangePassword, onSessionExpired }: {
  client: AuthClient; user: EmployeeUser; busy: boolean; error: string;
  onHome: () => void; onLogout: () => Promise<void>;
  onChangePassword: (current: string, replacement: string) => Promise<void>;
  onSessionExpired: () => void;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [missingEndpoint, setMissingEndpoint] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("profile");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    client.api<ProfileResponse>("me/profile").then(result => {
      if (active) {
        setProfile(validProfile(result?.data) ? result.data : null);
        setMissingEndpoint(false);
        setLoadError(result?.data && !validProfile(result.data) ? "Format data profil belum dapat dibaca." : "");
      }
    }).catch(reason => {
      if (!active) return;
      if (reason && typeof reason === "object" && "status" in reason && reason.status === 401) onSessionExpired();
      else if (reason && typeof reason === "object" && "status" in reason && reason.status === 404) setMissingEndpoint(true);
      else setLoadError(reason instanceof Error ? reason.message : "Profil belum dapat dimuat.");
    }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [client, reload, onSessionExpired]);
  const date = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));
  return <div className="employee-profile-page">
    <PageHeader title="Profil" description="Informasi diri Anda dikelola oleh HR."
      breadcrumb={[{ label: "Hari ini", href: "/" }, { label: "Profil" }]} onNavigate={onHome}
      actions={<Button variant="ghost" size="sm" onPress={() => { void onLogout(); }}><SignOut size={16} /> Keluar</Button>} />
    <UnderlineTabs items={[{ id: "profile", label: "Profil" }, { id: "security", label: "Keamanan" }]} active={tab} onSelect={setTab} />
    {tab === "profile" ? <section className="employee-profile-panel" aria-label="Data profil">
      <h2>Informasi diri</h2>
      {loaded && missingEndpoint && <><Notice message="Detail profil tersedia setelah rilis backend." /><p className="profile-guidance">{user.email} · Karyawan</p></>}
      {loaded && loadError && <><Notice message={loadError} /><Button size="sm" variant="secondary" onPress={() => { setLoaded(false); setReload(x => x + 1); }}>Muat ulang</Button></>}
      {!loaded ? <div className="profile-skeleton" aria-busy="true"><Skeleton /><Skeleton /><Skeleton /></div> : profile ? <dl className="profile-fields">
        <div><dt>Nama</dt><dd>{profile.name}</dd></div><div><dt>NIK</dt><dd>{profile.nik}</dd></div><div><dt>Email</dt><dd>{profile.email || user.email}</dd></div><div><dt>Telepon</dt><dd>{profile.phone || "Belum diisi"}</dd></div><div><dt>Departemen</dt><dd>{profile.department}</dd></div><div><dt>Jabatan</dt><dd>{profile.position}</dd></div><div><dt>Tanggal mulai</dt><dd>{date(profile.startDate)}</dd></div><div><dt>Status</dt><dd>{profile.status === "ACTIVE" ? "Aktif" : profile.status}</dd></div>
      </dl> : loaded && !missingEndpoint && !loadError && <Notice message="Profil karyawan belum dapat dimuat." />}
      <p className="profile-guidance">Untuk memperbarui data diri, silakan hubungi HR.</p>
      {loaded && missingEndpoint && <Button size="sm" variant="secondary" onPress={() => { setLoaded(false); setReload(x => x + 1); }}>Muat ulang</Button>}
    </section> : <section className="employee-profile-panel" aria-label="Keamanan akun">
      <h2>Ganti password</h2><p className="profile-guidance">Setelah password berubah, Anda akan keluar dan perlu masuk kembali.</p>
      <ChangePasswordForm busy={busy} error={error} onSubmit={onChangePassword} onLogout={onLogout} />
    </section>}
  </div>;
}
