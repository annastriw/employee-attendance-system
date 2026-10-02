import { isFreshLocation, type DeviceLocation } from "./capture-policy";

export function requestLocation(): Promise<DeviceLocation> {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext || !navigator.geolocation) {
      reject(new Error("Lokasi membutuhkan HTTPS dan browser yang mendukungnya."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => {
        const location = { latitude: position.coords.latitude, longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, capturedAt: position.timestamp };
        if (!isFreshLocation(location, Date.now())) reject(new Error("Lokasi belum valid. Coba lagi."));
        else resolve(location);
      },
      error => reject(new Error(error.code === 1
        ? "Izin lokasi ditolak. Izinkan lokasi di pengaturan situs, lalu coba lagi."
        : error.code === 3 ? "Pencarian lokasi melewati batas waktu. Aktifkan lokasi, lalu coba lagi."
        : "Lokasi tidak tersedia. Aktifkan layanan lokasi perangkat, lalu coba lagi.")),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  });
}

export function cameraError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "Izin kamera ditolak. Izinkan kamera di pengaturan situs, lalu coba lagi.";
    if (error.name === "NotFoundError") return "Kamera tidak ditemukan pada perangkat ini.";
    if (error.name === "NotReadableError") return "Kamera sedang dipakai aplikasi lain atau tidak dapat dibuka.";
  }
  return "Kamera tidak dapat dibuka. Periksa izin dan perangkat, lalu coba lagi.";
}

export function photograph(video: HTMLVideoElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!video.videoWidth || !video.videoHeight) { reject(new Error("Frame kamera belum tersedia.")); return; }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) { reject(new Error("Browser tidak dapat mengambil foto.")); return; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob && blob.type === "image/jpeg") resolve(blob);
      else reject(new Error("Foto tidak dapat dibuat. Coba lagi."));
    }, "image/jpeg", 0.85);
  });
}
