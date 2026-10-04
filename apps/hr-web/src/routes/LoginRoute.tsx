import { Navigate } from "react-router-dom";
import { PageTitle } from "../components/atoms/Brand";
import { Notice } from "../components/molecules/Notice";
import { LoginForm } from "../components/organisms/AuthForms";
import { AuthLayout } from "../components/templates/AuthLayout";
import { useAuth } from "./auth-context";
import { CHANGE_PASSWORD_PATH } from "./routes";

/**
 * Login screen. Mirrors the previous App.tsx login branch, including the
 * success notice shown after a password change. Once a session exists the
 * guard decides where to go: change-password gate or the workspace.
 */
export function LoginRoute() {
  const { user, busy, error, message, login } = useAuth();

  if (user)
    return (
      <Navigate
        to={user.mustChangePassword ? CHANGE_PASSWORD_PATH : "/"}
        replace
      />
    );

  return (
    <AuthLayout>
      <PageTitle>Masuk</PageTitle>
      <p className="page-intro">Gunakan akun admin HRD Anda.</p>
      {message && <Notice message={message} success />}
      <LoginForm busy={busy} error={error} onSubmit={login} />
    </AuthLayout>
  );
}
