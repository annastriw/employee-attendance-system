import { Alert, Button, Spinner } from "@heroui/react";
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  Clock,
  MapPin,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { PortalBrand } from "@attendance/ui";
import type { AuthClient } from "../../lib/auth-client";
import { useCapture } from "../../features/capture/use-capture";
import { usePhotoUpload } from "../../features/capture/use-photo-upload";
import type { PhotoPurpose } from "../../features/capture/photo-upload";
import "./capture-panel.css";

interface Props {
  client: AuthClient;
  purpose: PhotoPurpose;
  onBack: () => void;
  onSessionExpired: () => void;
}
export function CapturePanel({
  client,
  purpose,
  onBack,
  onSessionExpired,
}: Props) {
  const {
    video,
    phase,
    error,
    frame,
    photo,
    location,
    locationFresh,
    locationError,
    locationBusy,
    manualReady,
    start,
    stop,
    locate,
    capture: takePhoto,
  } = useCapture();
  const { upload, save } = usePhotoUpload(
    client,
    photo,
    purpose,
    onSessionExpired,
  );
  const preparing = phase === "model" || phase === "camera";
  const running = phase === "running";
  const busy = !!upload?.busy;
  const saved = !!upload?.ready;
  const hint =
    frame?.status === "multiple"
      ? "Pastikan hanya Anda yang terlihat."
      : frame?.status === "position"
        ? "Posisikan wajah di tengah bingkai."
        : frame?.status === "uncertain"
          ? "Hadap kamera dengan pencahayaan yang cukup."
          : frame?.status === "valid"
            ? frame.stable
              ? "Kedipkan kedua mata untuk mengambil foto."
              : "Tahan posisi sebentar."
            : "Posisikan wajah di tengah bingkai.";
  const locationText = locationBusy
    ? "Mencari lokasi…"
    : locationFresh
      ? "Lokasi siap"
      : locationError ||
        (location ? "Lokasi perlu diperbarui." : "Lokasi belum tersedia.");
  return (
    <main className="capture-page">
      <header className="capture-header">
        <PortalBrand
          name="Attendance Portal"
          icon={<Clock size={16} weight="bold" />}
        />
        <Button
          variant="ghost"
          isIconOnly
          aria-label="Kembali ke beranda"
          isDisabled={busy}
          onPress={() => {
            stop();
            onBack();
          }}
        >
          <ArrowLeft size={20} />
        </Button>
      </header>
      <div className="capture-title">
        <h1>{purpose === "CHECK_IN" ? "Foto check-in" : "Foto checkout"}</h1>
        <p>
          {photo
            ? "Periksa foto dan lokasi Anda."
            : "Foto otomatis setelah Anda berkedip."}
        </p>
      </div>
      <section className="capture-camera" aria-label="Kamera dan preview foto">
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          className={running ? "capture-video" : "capture-video capture-hidden"}
          aria-label="Kamera depan"
        />
        {photo ? (
          <img
            src={photo.url}
            alt="Preview foto absensi Anda"
            className="capture-preview"
          />
        ) : running ? (
          <div className="capture-guide" aria-hidden="true" />
        ) : (
          <div className="capture-placeholder">
            {preparing ? (
              <Spinner size="lg" />
            ) : (
              <Camera size={32} weight="light" aria-hidden="true" />
            )}
            <p>
              {phase === "model"
                ? "Menyiapkan deteksi wajah…"
                : phase === "camera"
                  ? "Menghubungkan kamera…"
                  : "Kamera belum aktif"}
            </p>
          </div>
        )}
      </section>
      {running && (
        <p className="capture-hint" role="status">
          {hint}
        </p>
      )}
      {error && (
        <Alert status="danger" role="alert">
          <Alert.Indicator>
            <WarningCircle size={20} aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Kamera belum siap</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {(running || photo) && (
        <section className="capture-location" aria-label="Status lokasi">
          <MapPin size={20} aria-hidden="true" />
          <div role="status">
            <strong>{locationText}</strong>
            {locationFresh && location && (
              <p>Akurasi ±{Math.ceil(location.accuracy)} m</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            isDisabled={locationBusy || busy}
            onPress={() => {
              void locate();
            }}
          >
            Perbarui
          </Button>
        </section>
      )}
      {upload?.error && (
        <Alert status="danger" role="alert">
          <Alert.Indicator>
            <WarningCircle size={20} aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Periksa penyimpanan foto</Alert.Title>
            <Alert.Description>{upload.error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {saved && (
        <div className="capture-ready" role="status">
          <CheckCircle size={20} aria-hidden="true" />
          <div>
            <strong>
              {locationFresh ? "Foto siap" : "Foto tersimpan; perbarui lokasi"}
            </strong>
            <p>Absensi belum dikirim.</p>
          </div>
        </div>
      )}
      <div className="capture-actions">
        {photo ? (
          <>
            <Button
              variant="outline"
              isDisabled={busy}
              onPress={() => {
                void start();
              }}
            >
              Ambil ulang
            </Button>
            {!saved && (
              <Button
                variant="primary"
                isPending={busy}
                isDisabled={busy || !locationFresh || locationBusy}
                onPress={() => {
                  void save();
                }}
              >
                {busy ? (
                  <>
                    <Spinner color="current" size="sm" /> Menyimpan…
                  </>
                ) : upload?.error ? (
                  "Coba simpan lagi"
                ) : (
                  "Simpan foto"
                )}
              </Button>
            )}
          </>
        ) : running || preparing ? (
          <>
            <Button variant="outline" onPress={stop}>
              <X size={16} aria-hidden="true" /> Hentikan
            </Button>
            <Button
              variant="primary"
              isDisabled={!manualReady}
              onPress={() => {
                void takePhoto();
              }}
            >
              Ambil foto
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            fullWidth
            onPress={() => {
              void start();
            }}
          >
            <Camera size={18} aria-hidden="true" /> Buka kamera
          </Button>
        )}
      </div>
      {!photo && !running && !preparing && (
        <p className="capture-note">
          Izinkan kamera dan lokasi untuk melanjutkan.
        </p>
      )}
    </main>
  );
}
