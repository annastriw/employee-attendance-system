import { useEffect, useRef, useState } from "react";
import { AuthError, type AuthClient } from "../../lib/auth-client";
import {
  getCheckInStatus,
  postCheckIn,
  readOperationRecord,
  type AttendancePurpose,
  type CheckInPayload,
  type CheckInRecord,
} from "../../lib/attendance-client";
interface Intent {
  purpose: AttendancePurpose;
  key: string;
  payload: CheckInPayload;
}
const intents = new WeakMap<AuthClient, Intent>();
export const hasPendingCheckIn = (client: AuthClient) => intents.has(client);
export const pendingAttendancePurpose = (client: AuthClient) =>
  intents.get(client)?.purpose;
export const clearPendingCheckIn = (client: AuthClient) => {
  intents.delete(client);
};
const unknownMessage =
  "Hasil absensi belum dapat dipastikan. Cek hasil sebelum mengubah foto atau lokasi.";
export function useCheckIn(
  client: AuthClient,
  onSessionExpired: () => void,
  purpose: AttendancePurpose = "CHECK_IN",
) {
  const [pending, setPending] = useState<Intent | null>(
    () => intents.get(client) ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() =>
    intents.has(client) ? unknownMessage : "",
  );
  const [code, setCode] = useState("");
  const [record, setRecord] = useState<CheckInRecord | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const cancel = () => {
      controller.current?.abort();
      controller.current = null;
      if (mounted.current) {
        setBusy(false);
        if (intents.has(client)) setError(unknownMessage);
      }
    };
    const hidden = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", cancel);
    return () => {
      mounted.current = false;
      cancel();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", cancel);
    };
  }, [client]);
  const current = (c: AbortController) =>
    mounted.current && !c.signal.aborted && controller.current === c;
  function done(row: CheckInRecord) {
    clearPendingCheckIn(client);
    setPending(null);
    setRecord(row);
    setError("");
    setCode("");
  }
  function rejected(message: string, failureCode = "") {
    clearPendingCheckIn(client);
    setPending(null);
    setError(message);
    setCode(failureCode);
  }
  function expire() {
    clearPendingCheckIn(client);
    setPending(null);
    onSessionExpired();
  }
  async function reconcile(c: AbortController) {
    if (intents.get(client)?.purpose !== purpose) {
      setError(unknownMessage);
      return;
    }
    try {
      const status = await getCheckInStatus(
        client,
        intents.get(client)!.key,
        c.signal,
      );
      if (!current(c)) return;
      if (status.state === "SUCCEEDED")
        done(readOperationRecord(status.response?.data, purpose));
      else if (status.state === "REJECTED" || status.state === "RETRYABLE") {
        rejected(
          status.response?.error?.message ??
            "Absensi belum tersimpan. Periksa data dan coba lagi.",
          status.response?.error?.code,
        );
      } else setError("Absensi masih diproses. Cek hasil lagi sebentar.");
    } catch (reason) {
      if (!current(c)) return;
      if (reason instanceof AuthError && reason.status === 401) expire();
      else setError(unknownMessage);
    }
  }
  async function run(task: (c: AbortController) => Promise<void>) {
    if (controller.current || record) return;
    const c = new AbortController();
    controller.current = c;
    setBusy(true);
    setCode("");
    try {
      await task(c);
    } finally {
      if (current(c)) {
        controller.current = null;
        setBusy(false);
      }
    }
  }
  async function submit(payload?: CheckInPayload) {
    await run(async (c) => {
      let intent = intents.get(client);
      if (intent && intent.purpose !== purpose) {
        setError("Periksa pengiriman sebelumnya dari Hari ini.");
        return;
      }
      if (!intent) {
        if (!payload) return;
        intent = {
          purpose,
          key: crypto.randomUUID(),
          payload: structuredClone(payload),
        };
        intents.set(client, intent);
        setPending(intent);
      }
      setError("");
      try {
        const row = await postCheckIn(
          client,
          intent.payload,
          intent.key,
          c.signal,
          purpose,
        );
        if (current(c)) done(row);
      } catch (reason) {
        if (!current(c)) return;
        if (reason instanceof AuthError && reason.status === 401) expire();
        else if (
          reason instanceof AuthError &&
          [400, 403].includes(reason.status)
        )
          rejected(reason.message, reason.code);
        else {
          setError(unknownMessage);
          await reconcile(c);
        }
      }
    });
  }
  async function check() {
    if (intents.has(client)) await run(reconcile);
  }
  return { busy, pending: !!pending, error, code, record, submit, check };
}
