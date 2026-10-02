import type { AuthClient } from "../../lib/auth-client";
import { isFreshLocation, type DeviceLocation } from "./capture-policy";

export type PhotoPurpose = "CHECK_IN" | "CHECK_OUT";
export interface CapturedPhoto {
  blob: Blob;
  url: string;
  method: "BLINK" | "MANUAL";
  capturedAt: number;
  location: DeviceLocation;
}
export interface ReadyPhoto {
  id: string;
  status: "READY";
  purpose: PhotoPurpose;
  checksumSha256: string;
  byteSize: number;
  width: number;
  height: number;
}
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function uploadPhoto(
  client: AuthClient,
  photo: CapturedPhoto,
  purpose: PhotoPurpose,
  key: string,
  signal: AbortSignal,
): Promise<ReadyPhoto> {
  if (!isFreshLocation(photo.location, Date.now()))
    throw new Error("Perbarui lokasi sebelum menyimpan foto.");
  const body = new FormData();
  body.append("purpose", purpose);
  body.append("photo", photo.blob, "attendance.jpg");
  const value = await client.api<ReadyPhoto>("media/attendance-photos", {
    method: "POST",
    body,
    idempotencyKey: key,
    signal,
  });
  if (
    !value ||
    !uuid.test(value.id) ||
    value.status !== "READY" ||
    value.purpose !== purpose ||
    !/^[0-9a-f]{64}$/.test(value.checksumSha256) ||
    !Number.isInteger(value.byteSize) ||
    value.byteSize <= 0 ||
    value.byteSize > 2 * 1024 * 1024 ||
    !Number.isInteger(value.width) ||
    !Number.isInteger(value.height) ||
    value.width < 160 ||
    value.height < 160 ||
    value.width > 1280 ||
    value.height > 1280
  ) {
    throw new Error(
      "Status foto belum dapat dipastikan. Coba simpan lagi untuk memeriksanya.",
    );
  }
  return value;
}

function wib(at: number) {
  if (!Number.isFinite(at)) throw new Error("Waktu capture tidak valid.");
  return new Date(at + 7 * 60 * 60 * 1000).toISOString().replace("Z", "+07:00");
}

// T21 consumes this evidence and assigns authoritative attendance time on the server.
export function prepareEvidence(
  photo: CapturedPhoto,
  ready: ReadyPhoto,
  now = Date.now(),
) {
  if (!isFreshLocation(photo.location, now))
    throw new Error("Perbarui lokasi sebelum mengirim absensi.");
  return {
    photoObjectId: ready.id,
    purpose: ready.purpose,
    captureMethod:
      photo.method === "BLINK" ? ("AUTO" as const) : ("MANUAL" as const),
    clientCapturedAt: wib(photo.capturedAt),
    location: {
      latitude: photo.location.latitude,
      longitude: photo.location.longitude,
      accuracyMeters: photo.location.accuracy,
      capturedAt: wib(photo.location.capturedAt),
    },
  };
}
