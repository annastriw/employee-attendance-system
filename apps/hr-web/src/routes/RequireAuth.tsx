import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthLayout } from "../components/templates/AuthLayout";
import { useAuth } from "./auth-context";
import { CHANGE_PASSWORD_PATH, LOGIN_PATH } from "./routes";

/**
 * Protects the workspace. While the session is being restored it shows the
 * same "checking session" placeholder as before. When no session exists it
 * redirects to login; this is also how a lost session (restore() failed or a
 * 401 cleared the user) sends the operator back to /masuk. Accounts that still
 * must change their password are routed to the change-password screen.
 */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <AuthLayout>
        <p role="status" className="loading-session">
          Memeriksa sesi Anda…
        </p>
      </AuthLayout>
    );

  if (!user)
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;

  if (user.mustChangePassword)
    return <Navigate to={CHANGE_PASSWORD_PATH} replace />;

  return <Outlet />;
}
