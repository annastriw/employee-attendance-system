import { useCallback, useEffect, useState } from "react";
import { AuthError, type AuthClient } from "../../lib/auth-client";
import { getToday, type Today } from "../../lib/attendance-client";
export function useToday(client: AuthClient, onSessionExpired: () => void) {
  const [data, setData] = useState<Today | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const c = new AbortController();
    void getToday(client, c.signal)
      .then((value) => {
        if (!c.signal.aborted) {
          setData(value.data);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (c.signal.aborted) return;
        if (reason instanceof AuthError && reason.status === 401)
          onSessionExpired();
        else {
          setData(null);
          setError(
            reason instanceof Error
              ? reason.message
              : "Data hari ini belum tersedia.",
          );
        }
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [client, version, onSessionExpired]);
  return { data, loading, error, reload };
}
