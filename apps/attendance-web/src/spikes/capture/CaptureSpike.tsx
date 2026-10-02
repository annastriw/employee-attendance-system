import { Button } from "@heroui/react";
import { Camera, MapPin, Stop, ArrowCounterClockwise, Clock } from "@phosphor-icons/react";
import { PortalBrand } from "@attendance/ui";
import { useCaptureSpike } from "./use-capture-spike";

const hints = {
  none: "Posisikan wajah di dalam panduan.",
  multiple: "Pastikan hanya satu wajah di kamera.",
  uncertain: "Wajah belum jelas. Perbaiki pencahayaan.",
  position: "Posisikan wajah di tengah panduan.",
  valid: "Kedipkan kedua mata.",
};

export function CaptureSpike() {
  const { video, phase, error, frame, photo, location, locationFresh, locationError, locationBusy, manualReady, start, stop, locate, capture: takePhoto } = useCaptureSpike();
  const active = ["model", "camera", "running"].includes(phase);
  let hint = "Foto dan lokasi hanya dipakai untuk uji perangkat.";
  if (phase === "model") hint = "Memuat model wajah…";
  if (phase === "camera") hint = "Membuka kamera…";
  if (phase === "running") hint = frame
    ? frame.stable ? hints[frame.status] : frame.status === "valid" ? "Tahan posisi sebentar." : hints[frame.status]
    : "Menunggu frame kamera…";
  if (phase === "preview") hint = "Foto diambil. Periksa hasilnya.";
  if (phase === "stopped") hint = "Kamera dihentikan.";
  const locationHint = locationBusy ? "Mencari lokasi…"
    : locationError || (locationFresh && location
      ? `Lokasi siap · akurasi ±${Math.round(location.accuracy)} m`
      : location ? "Lokasi kedaluwarsa. Perbarui lokasi." : "Lokasi belum tersedia.");

  return (
    <main className="capture-spike">
      <header>
        <PortalBrand name="Attendance Portal" icon={<Clock size={16} weight="bold" />} />
        <h1>Uji kamera dan lokasi</h1>
        <p className="capture-note">Prototipe development. Foto tidak dikirim atau disimpan.</p>
      </header>
      <section aria-label="Kamera">
        <div className="capture-view" data-preview={phase === "preview"} data-valid={frame?.stable ?? false}>
          <video ref={video} autoPlay playsInline muted aria-label="Kamera depan" />
          {photo && <img src={photo.url} alt="Preview foto hasil capture" />}
          {!active && !photo && <Camera className="capture-placeholder" size={40} aria-hidden="true" />}
          {phase === "running" && <div className="capture-guide" aria-hidden="true" />}
        </div>
        <p role="status" className="capture-hint">{hint}</p>
        {error && <p role="alert" className="capture-error">{error}</p>}
        <div className="capture-actions">
          {!active && !photo && <Button onPress={() => { void start(); }}><Camera size={18} />Mulai</Button>}
          {active && <Button variant="secondary" onPress={stop}><Stop size={18} />Hentikan</Button>}
          {phase === "running" && <Button isDisabled={!manualReady} onPress={() => { void takePhoto(); }}>Ambil foto</Button>}
          {photo && <Button onPress={() => { void start(); }}><ArrowCounterClockwise size={18} />Ambil ulang</Button>}
          {photo && <Button variant="secondary" onPress={stop}>Selesai</Button>}
        </div>
      </section>
      <section className="capture-location" aria-label="Lokasi">
        <MapPin size={20} aria-hidden="true" />
        <div>
          <p role="status">{locationHint}</p>
          {(active || photo) && <Button variant="ghost" size="sm" isDisabled={locationBusy} onPress={() => { void locate(); }}>
            {location ? "Perbarui lokasi" : "Coba lokasi lagi"}
          </Button>}
        </div>
      </section>
      {phase === "running" && !locationFresh && <p className="capture-note">Foto membutuhkan lokasi aktif dan satu wajah yang jelas.</p>}
      {photo && <p role="status" className="capture-note">
        {locationFresh ? "Foto dan lokasi siap diuji. Belum ada absensi yang dikirim." : "Lokasi perlu diperbarui sebelum draft dapat digunakan."}
      </p>}
      {frame && <details className="capture-diagnostics">
        <summary>Detail pengujian</summary>
        <dl>
          <div><dt>Jumlah wajah</dt><dd>{frame.count}</dd></div>
          <div><dt>Confidence</dt><dd>{frame.confidence.toFixed(3)}</dd></div>
          <div><dt>Score kedip kiri / kanan</dt><dd>{Number.isFinite(frame.left) ? frame.left.toFixed(2) : "—"} / {Number.isFinite(frame.right) ? frame.right.toFixed(2) : "—"}</dd></div>
          <div><dt>Inference terakhir</dt><dd>{Math.round(frame.inferenceMs)} ms</dd></div>
          {photo && <div><dt>Metode / ukuran JPEG</dt><dd>{photo.method} / {Math.round(photo.blob.size / 1024)} KB</dd></div>}
        </dl>
      </details>}
    </main>
  );
}
