import { Button } from "@heroui/react";
import { Clock } from "@phosphor-icons/react";
import { AuthShell } from "@attendance/ui";
import { CapturePanel } from "../components/organisms/CapturePanel";
import { Notice } from "../components/molecules/Notice";
import type { AuthClient } from "../lib/auth-client";
import type { AttendancePurpose } from "../lib/attendance-client";
import { useToday } from "../features/checkin/use-today";
import {
  hasPendingCheckIn,
  pendingAttendancePurpose,
} from "../features/checkin/use-check-in";
export default function CapturePage({
  client,
  purpose = "CHECK_IN",
  onBack,
  onSessionExpired,
}: {
  client: AuthClient;
  purpose?: AttendancePurpose;
  onBack: () => void;
  onSessionExpired: () => void;
}) {
  const today = useToday(client, onSessionExpired);
  const checkout = purpose === "CHECK_OUT";
  const differentPending =
    hasPendingCheckIn(client) && pendingAttendancePurpose(client) !== purpose;
  if (
    differentPending ||
    (!hasPendingCheckIn(client) &&
      (today.loading ||
        !today.data?.eligible ||
        today.data.status !== (checkout ? "CHECKED_IN" : "NOT_CHECKED_IN")))
  ) {
    return (
      <AuthShell
        name="Attendance Portal"
        brandIcon={<Clock size={16} weight="bold" />}
      >
        <h1>{checkout ? "Checkout" : "Check-in"}</h1>
        {today.loading ? (
          <p role="status">Memeriksa absensi…</p>
        ) : (
          <Notice
            message={
              (differentPending
                ? "Periksa pengiriman sebelumnya dari Hari ini."
                : "") ||
              today.error ||
              today.data?.ineligibilityMessage ||
              "Absensi hari ini sudah tercatat."
            }
          />
        )}
        {today.error && (
          <Button variant="outline" fullWidth onPress={today.reload}>
            Muat ulang
          </Button>
        )}
        <Button variant="ghost" fullWidth onPress={onBack}>
          Kembali ke beranda
        </Button>
      </AuthShell>
    );
  }
  return (
    <CapturePanel
      client={client}
      purpose={purpose}
      dailyRecordId={today.data?.record?.id}
      reasonRequired={
        (checkout
          ? today.data?.checkoutReasonRequired
          : today.data?.reasonRequired) ?? false
      }
      onBack={onBack}
      onSessionExpired={onSessionExpired}
    />
  );
}
