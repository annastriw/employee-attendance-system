import { useEffect, useRef, useState } from "react";
import { Alert, Button, Spinner, Label, TextArea } from "@heroui/react";
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
import {
  prepareEvidence,
  type PhotoPurpose,
} from "../../features/capture/photo-upload";
import { useCheckIn } from "../../features/checkin/use-check-in";
import { clockLabel } from "../../lib/attendance-client";
import "../../styles/capture-panel.css";

interface Props {
  client: AuthClient;
  purpose: PhotoPurpose;
  reasonRequired?: boolean;
  dailyRecordId?: string;
  onBack: () => void;
  onSessionExpired: () => void;
}
export function CapturePanel({
  client,
  purpose,
  reasonRequired = false,
  dailyRecordId,
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

  const checkIn = useCheckIn(client, onSessionExpired, purpose);
  const checkout = purpose === "CHECK_OUT";
  const actionLabel = checkout ? "checkout" : "check-in";
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const reasonField = useRef<HTMLTextAreaElement>(null);
  const sendLock = useRef(false);
  const needsReason = reasonRequired || checkIn.code === "REASON_REQUIRED";
  useEffect(() => {
    if (checkIn.code === "REASON_REQUIRED") reasonField.current?.focus();
  }, [checkIn.code]);
  async function send() {
    if (!photo || sendLock.current || checkIn.pending || checkIn.record) return;
    if (needsReason && !reason.trim()) {
      setSubmitError(
        checkout ? "Isi alasan pulang awal." : "Isi alasan terlambat.",
      );
      reasonField.current?.focus();
      return;
    }
    if (checkout && !dailyRecordId) {
      setSubmitError("Catatan check-in belum tersedia. Kembali ke Hari ini.");
      return;
    }
    sendLock.current = true;
    setSending(true);
    setSubmitError("");
    try {
      const ready = await save();
      if (!ready) return;
      const evidence = prepareEvidence(photo, ready);
      const payload = {
        ...(checkout ? { dailyRecordId } : {}),
        photoObjectId: evidence.photoObjectId,
        clientCapturedAt: evidence.clientCapturedAt,
        captureMethod: evidence.captureMethod,
        location: evidence.location,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      };
      await checkIn.submit(payload);
    } catch (failure) {
      setSubmitError(
        failure instanceof Error ? failure.message : "Periksa foto dan lokasi.",
      );
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }

  const preparing = phase === "model" || phase === "camera";
  const running = phase === "running";
  const busy = sending || !!upload?.busy || checkIn.busy;
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

  const resultEvent = checkout
    ? checkIn.record?.checkOut
    : checkIn.record?.checkIn;
  if (checkIn.record && resultEvent)
    return (
      <main className="capture-page">
        <header className="capture-header">
          <PortalBrand
            name="Attendance Portal"
            icon={<Clock size={16} weight="bold" />}
          />
        </header>
        <div className="capture-success" role="status">
          <CheckCircle size={32} aria-hidden="true" />
          <h1>{checkout ? "Checkout tercatat" : "Check-in tercatat"}</h1>
          <p className="capture-success-time">
            {clockLabel(resultEvent.eventTime)} <span>WIB</span>
          </p>
          <p>
            {resultEvent.isOutsideSchedule
              ? "Di luar jadwal"
              : checkout
                ? checkIn.record.checkOut?.isEarlyDeparture
                  ? "Pulang lebih awal"
                  : "Sesuai jadwal"
                : checkIn.record.checkIn.isLate
                  ? "Terlambat"
                  : "Tepat waktu"}
          </p>
        </div>
        <Button variant="primary" fullWidth onPress={onBack}>
          Lihat hari ini
        </Button>
      </main>
    );

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
          isDisabled={busy || checkIn.pending}
          onPress={() => {
            stop();
            onBack();
          }}
        >
          <ArrowLeft size={20} />
        </Button>
      </header>
      <div className="capture-title">
        <h1>
          {checkIn.pending
            ? "Periksa " + actionLabel
            : purpose === "CHECK_IN"
              ? "Foto check-in"
              : "Foto checkout"}
        </h1>
        <p>
          {checkIn.pending
            ? "Periksa hasil pengiriman sebelumnya."
            : photo
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
            isDisabled={locationBusy || busy || checkIn.pending}
            onPress={() => {
              void locate();
            }}
          >
            Perbarui
          </Button>
        </section>
      )}

      {photo && (needsReason || reason) && (
        <div className="capture-reason">
          <Label htmlFor="checkin-reason" isRequired={needsReason}>
            {checkout ? "Alasan pulang awal" : "Alasan terlambat"}
          </Label>
          <TextArea
            id="checkin-reason"
            ref={reasonField}
            fullWidth
            rows={3}
            maxLength={500}
            required={needsReason}
            disabled={busy || checkIn.pending}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tuliskan alasan singkat"
          />
        </div>
      )}
      {(checkIn.error || submitError) && (
        <Alert status="danger" role="alert">
          <Alert.Indicator>
            <WarningCircle size={20} aria-hidden="true" />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>Periksa {actionLabel}</Alert.Title>
            <Alert.Description>
              {checkIn.error || submitError}
            </Alert.Description>
          </Alert.Content>
        </Alert>
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
            <p>
              {checkIn.pending
                ? "Memeriksa hasil " + actionLabel + "."
                : "Siap dikirim bersama lokasi."}
            </p>
          </div>
        </div>
      )}

      <div className="capture-actions">
        {checkIn.pending ? (
          <>
            <Button
              variant="outline"
              isDisabled={busy}
              onPress={() => {
                void checkIn.check();
              }}
            >
              Cek hasil
            </Button>
            <Button
              variant="primary"
              isDisabled={busy}
              isPending={busy}
              onPress={() => {
                void checkIn.submit();
              }}
            >
              Kirim ulang
            </Button>
          </>
        ) : photo ? (
          <>
            <Button
              variant="outline"
              isDisabled={busy}
              onPress={() => {
                setSubmitError("");
                void start();
              }}
            >
              Ambil ulang
            </Button>
            <Button
              variant="primary"
              isPending={busy}
              isDisabled={busy || !locationFresh || locationBusy}
              onPress={() => {
                void send();
              }}
            >
              {busy ? (
                <>
                  <Spinner color="current" size="sm" /> Mengirim…
                </>
              ) : (
                "Kirim " + actionLabel
              )}
            </Button>
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

      {!checkIn.pending && !photo && !running && !preparing && (
        <p className="capture-note">
          Izinkan kamera dan lokasi untuk melanjutkan.
        </p>
      )}
    </main>
  );
}
