import { createContext, useContext } from "react";
import type { AdminUser, AuthClient } from "../lib/auth-client";

export interface AuthState {
  user: AdminUser | null;
  loading: boolean;
  busy: boolean;
  error: string;
  message: string;
  client: AuthClient;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (current: string, replacement: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Clears the session locally and shows the expired-session notice. */
  sessionExpired: () => void;
  /** Clears any transient error/message, e.g. when leaving a screen. */
  clearFeedback: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  return value;
}
