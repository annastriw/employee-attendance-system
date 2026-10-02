export const CAPTURE_POLICY = {
  confidence: 0.8, stableMs: 800, frameMaxAgeMs: 400,
  eyesOpen: 0.25, eyesClosed: 0.55, blinkMinMs: 80, blinkMaxMs: 1000,
  locationMaxAgeMs: 60_000, futureToleranceMs: 5000,
} as const;

export interface FaceObservation {
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}
export interface DeviceLocation {
  latitude: number; longitude: number; accuracy: number; capturedAt: number;
}
export type FaceStatus = "none" | "multiple" | "uncertain" | "position" | "valid";

export function evaluateFaces(faces: FaceObservation[]): FaceStatus {
  if (faces.length === 0) return "none";
  if (faces.length !== 1) return "multiple";
  const { confidence, box: b } = faces[0];
  if (!Number.isFinite(confidence) || confidence < CAPTURE_POLICY.confidence || confidence > 1) return "uncertain";
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  if (![b.x, b.y, b.width, b.height].every(Number.isFinite) ||
      b.width <= 0 || b.height < 0.2 || b.height > 0.75 ||
      b.x < 0.05 || b.y < 0.05 || b.x + b.width > 0.95 || b.y + b.height > 0.95 ||
      cx < 0.3 || cx > 0.7 || cy < 0.25 || cy > 0.7) return "position";
  return "valid";
}

export function isFreshLocation(location: DeviceLocation | null, now: number): location is DeviceLocation {
  return location !== null &&
    [location.latitude, location.longitude, location.accuracy, location.capturedAt, now].every(Number.isFinite) &&
    Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180 &&
    location.accuracy >= 0 && now - location.capturedAt <= CAPTURE_POLICY.locationMaxAgeMs &&
    now - location.capturedAt >= -CAPTURE_POLICY.futureToleranceMs;
}

/** Resets on invalid faces and frame gaps; a held closed eye never captures. */
export class BlinkGate {
  private stableSince: number | null = null;
  private lastAt: number | null = null;
  private opened = false;
  private closedAt: number | null = null;

  reset() {
    this.stableSince = this.lastAt = this.closedAt = null;
    this.opened = false;
  }

  update(at: number, valid: boolean, left: number, right: number) {
    if (!valid || ![at, left, right].every(Number.isFinite) ||
        left < 0 || right < 0 || left > 1 || right > 1) {
      this.reset();
      return { stable: false, blink: false };
    }
    if (this.lastAt !== null && (at - this.lastAt > CAPTURE_POLICY.frameMaxAgeMs || at <= this.lastAt)) this.reset();
    this.lastAt = at;
    this.stableSince ??= at;
    const stable = at - this.stableSince >= CAPTURE_POLICY.stableMs;
    if (!stable) return { stable: false, blink: false };
    const open = left <= CAPTURE_POLICY.eyesOpen && right <= CAPTURE_POLICY.eyesOpen;
    const closed = left >= CAPTURE_POLICY.eyesClosed && right >= CAPTURE_POLICY.eyesClosed;
    if (open) {
      const duration = this.closedAt === null ? 0 : at - this.closedAt;
      const blink = this.opened && this.closedAt !== null &&
        duration >= CAPTURE_POLICY.blinkMinMs && duration <= CAPTURE_POLICY.blinkMaxMs;
      this.opened = true;
      this.closedAt = null;
      return { stable, blink };
    }
    if (closed && this.opened) this.closedAt ??= at;
    if (this.closedAt !== null && at - this.closedAt > CAPTURE_POLICY.blinkMaxMs) {
      this.opened = false;
      this.closedAt = null;
    }
    return { stable, blink: false };
  }
}
