import { Navigate } from "react-router-dom";
import { PageTitle } from "../components/atoms/Brand";
import { ChangePasswordForm } from "../components/organisms/AuthForms";
import { AuthLayout } from "../components/templates/AuthLayout";
import { useAuth } from "./auth-context";
import { LOGIN_PATH } from "./routes";
import { WorkspaceAccountMenu } from "@attendance/ui";

/**
 * Mandatory password-change screen for first-time accounts. Mirrors the former
 * App.tsx change-password branch; after success the provider clears the user
 * and sets the success message, so this route redirects back to login.
 */
export function ChangePasswordRoute() {
  const { user, busy, error, logout, changePassword } = useAuth();

  // Only reachable with a signed-in account that still must change its password.
  if (!user) return <Navigate to={LOGIN_PATH} replace />;
  if (!user.mustChangePassword) return <Navigate to="/" replace />;

  return (
    <AuthLayout account={<WorkspaceAccountMenu email={user.email} busy={busy} onLogout={logout} />}>
      <PageTitle>Buat password baru</PageTitle>
      <p className="page-intro">Ganti password awal untuk melanjutkan.</p>
      <p className="signed-in-email">{user.email}</p>
      <ChangePasswordForm
        busy={busy}
        error={error}
        onSubmit={changePassword}
      />
    </AuthLayout>
  );
}
