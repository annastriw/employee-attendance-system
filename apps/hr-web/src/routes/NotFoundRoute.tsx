import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { Compass } from "@phosphor-icons/react";
import { EmptyState } from "@attendance/ui";

/**
 * Catch-all for unknown paths. Uses the shared EmptyState so a mistyped or
 * stale deep link lands on a guiding page instead of a blank screen, with a
 * single way back into the workspace.
 */
export function NotFoundRoute() {
  const navigate = useNavigate();
  return (
    <div className="not-found-page">
      <EmptyState
        icon={<Compass size={22} />}
        title="Halaman tidak ditemukan"
        body="Alamat yang Anda buka tidak tersedia atau sudah dipindahkan."
        action={
          <Button variant="primary" onPress={() => navigate("/")}>
            Kembali ke ringkasan
          </Button>
        }
      />
    </div>
  );
}
