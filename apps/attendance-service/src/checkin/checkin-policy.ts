import { HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
export interface CheckInInput {
  photoObjectId: string;
  clientCapturedAt: string;
  captureMethod: 'AUTO' | 'MANUAL';
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt: string;
  };
  reason?: string | null;
}
export interface CheckOutInput extends CheckInInput {
  dailyRecordId: string;
}
export function checkoutPayloadHash(input: CheckOutInput): string {
  return createHash('sha256')
    .update(
      'CHECK_OUT:' +
        input.dailyRecordId.toLowerCase() +
        ':' +
        payloadHash(input),
    )
    .digest('hex');
}
export function rejection(code: string, message: string, status = 422) {
  return new HttpException({ code, message }, status);
}
export function payloadHash(input: CheckInInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        photoObjectId: input.photoObjectId,
        clientCapturedAt: new Date(input.clientCapturedAt).toISOString(),
        captureMethod: input.captureMethod,
        reason: input.reason?.trim() || null,
        location: {
          latitude: input.location.latitude,
          longitude: input.location.longitude,
          accuracyMeters: input.location.accuracyMeters,
          capturedAt: new Date(input.location.capturedAt).toISOString(),
        },
      }),
    )
    .digest('hex');
}
export function validateEvidence(input: CheckInInput, at: Date): void {
  const age = at.getTime() - Date.parse(input.location.capturedAt);
  if (!Number.isFinite(age) || age > 60000 || age < -5000)
    throw rejection(
      'LOCATION_STALE',
      'Perbarui lokasi sebelum mengirim absensi.',
    );
  const photoTime = Date.parse(input.clientCapturedAt);
  if (!Number.isFinite(photoTime) || photoTime > at.getTime() + 5000)
    throw rejection(
      'CAPTURE_TIME_INVALID',
      'Waktu foto tidak valid. Periksa jam perangkat dan ambil ulang.',
    );
}
export function wib(date: Date): string {
  return new Date(date.getTime() + 7 * 3600000)
    .toISOString()
    .replace('Z', '+07:00');
}
@Injectable()
export class ServerClock {
  now(): Date {
    return new Date();
  }
}
