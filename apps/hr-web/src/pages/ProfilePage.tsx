import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { PageHeader, Notice, Skeleton, UnderlineTabs, ChangePasswordForm } from "@attendance/ui";
import type { AuthClient, AdminUser } from "../lib/auth-client";

interface ProfileData { name: string; nik: string; email: string; phone: string | null; department: string; position: string; startDate: string; status: string; }
interface ProfileResponse { data: ProfileData | null; }

export function ProfilePage({ client, user, busy, error, onChangePassword, onSessionExpired }: {
  client: AuthClient; user: AdminUser; busy: boolean; error: string;
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
      if (active) { setProfile(result.data); setMissingEndpoint(false); setLoadError(""); }
    }).catch(reason => {
      if (!active) return;
      if (reason && typeof reason === "object" && "status" in reason && reason.status === 401) onSessionExpired();
      else if (reason && typeof reason === "object" && "status" in reason && reason.status === 404) setMissingEndpoint(true);
      else setLoadError(reason instanceof Error ? reason.message : "Profil belum dapat dimuat.");
    }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [client, reload, onSessionExpired]);
  const date = (value: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));
  return <div className="profile-page">
    <PageHeader breadcrumb={[{ label: "Profil" }]} title="Profil" description="Informasi akun Anda. Data diri dikelola oleh HR." />
    <UnderlineTabs items={[{ id: "profile", label: "Profil" }, { id: "security", label: "Keamanan" }]} active={tab} onSelect={setTab} />
    {tab === "profile" ? <section className="profile-panel" aria-label="Data profil">
      <h2>Informasi diri</h2>
      {loaded && missingEndpoint && <Notice message="Detail profil karyawan tersedia setelah rilis backend." />}
      {loaded && loadError && <><Notice message={loadError} /><Button size="sm" variant="secondary" onPress={() => { setLoaded(false); setReload(x => x + 1); }}>Muat ulang</Button></>}
      {loaded && !profile && !loadError && <p className="profile-guidance">{user.email} · Admin HRD</p>}
      {!loaded ? <div className="profile-skeleton" aria-busy="true"><Skeleton /><Skeleton /><Skeleton /></div> : profile && <dl className="profile-fields">
        <div><dt>Nama</dt><dd>{profile.name}</dd></div><div><dt>NIK</dt><dd>{profile.nik}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div><div><dt>Telepon</dt><dd>{profile.phone || "Belum diisi"}</dd></div><div><dt>Departemen</dt><dd>{profile.department}</dd></div><div><dt>Jabatan</dt><dd>{profile.position}</dd></div><div><dt>Tanggal mulai</dt><dd>{date(profile.startDate)}</dd></div><div><dt>Status</dt><dd>{profile.status === "ACTIVE" ? "Aktif" : profile.status}</dd></div>
      </dl>}
      <p className="profile-guidance">Perubahan data diri dapat diminta kepada HR.</p>
      {loaded && missingEndpoint && <Button size="sm" variant="secondary" onPress={() => { setLoaded(false); setReload(x => x + 1); }}>Muat ulang</Button>}
    </section> : <section className="profile-panel profile-security" aria-label="Keamanan akun">
      <h2>Ganti password</h2><p className="profile-guidance">Setelah password berubah, Anda akan keluar dan perlu masuk kembali.</p>
      <ChangePasswordForm busy={busy} error={error} onSubmit={onChangePassword} />
    </section>}
  </div>;
}
