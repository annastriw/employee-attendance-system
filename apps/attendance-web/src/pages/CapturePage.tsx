import { Button } from "@heroui/react";
import { Clock } from "@phosphor-icons/react";
import { AuthShell } from "@attendance/ui";
import { CapturePanel } from "../components/organisms/CapturePanel";
import { Notice } from "../components/molecules/Notice";
import type { AuthClient } from "../lib/auth-client";
import { useToday } from "../features/checkin/use-today";
import { hasPendingCheckIn } from "../features/checkin/use-check-in";
export default function CapturePage({
  client,
  onBack,
  onSessionExpired,
}: {
  client: AuthClient;
  onBack: () => void;
  onSessionExpired: () => void;
}) {
  const today = useToday(client, onSessionExpired);
  if (
    !hasPendingCheckIn(client) &&
    (today.loading ||
      !today.data?.eligible ||
      today.data.status !== "NOT_CHECKED_IN")
  ) {
    return (
      <AuthShell
        name="Attendance Portal"
        brandIcon={<Clock size={16} weight="bold" />}
      >
        <h1>Check-in</h1>
        {today.loading ? (
          <p role="status">Memeriksa absensi…</p>
        ) : (
          <Notice
            message={
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
      purpose="CHECK_IN"
      reasonRequired={today.data?.reasonRequired ?? false}
      onBack={onBack}
      onSessionExpired={onSessionExpired}
    />
  );
}
