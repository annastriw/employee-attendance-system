import { CapturePanel } from "../components/organisms/CapturePanel";
import type { AuthClient } from "../lib/auth-client";

export default function CapturePage({
  client,
  onBack,
  onSessionExpired,
}: {
  client: AuthClient;
  onBack: () => void;
  onSessionExpired: () => void;
}) {
  return (
    <CapturePanel
      client={client}
      purpose="CHECK_IN"
      onBack={onBack}
      onSessionExpired={onSessionExpired}
    />
  );
}
