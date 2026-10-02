import { describe, expect, it, vi } from "vitest";
import type { AuthClient } from "../../lib/auth-client";
import {
  prepareEvidence,
  uploadPhoto,
  type CapturedPhoto,
  type ReadyPhoto,
} from "./photo-upload";

export const ready: ReadyPhoto = {
  id: "ed1ee3a0-0da2-4529-8694-d5e6e582c063",
  status: "READY",
  purpose: "CHECK_IN",
  checksumSha256: "a".repeat(64),
  byteSize: 100,
  width: 640,
  height: 480,
};
const photo = (): CapturedPhoto => ({
  blob: new Blob(["jpeg"], { type: "image/jpeg" }),
  url: "blob:photo",
  method: "BLINK",
  capturedAt: Date.now(),
  location: {
    latitude: -6,
    longitude: 106,
    accuracy: 25,
    capturedAt: Date.now(),
  },
});
const key = "820f9426-9677-4438-98ad-fd8a8938f745";

describe("photo evidence and upload", () => {
  it("sends only JPEG and purpose as multipart through the authenticated client", async () => {
    const api = vi.fn().mockResolvedValue(ready);
    const signal = new AbortController().signal;
    const captured = photo();
    expect(
      await uploadPhoto(
        { api } as unknown as AuthClient,
        captured,
        "CHECK_IN",
        key,
        signal,
      ),
    ).toEqual(ready);
    const [path, init] = api.mock.calls[0];
    expect(path).toBe("media/attendance-photos");
    expect(init).toMatchObject({ method: "POST", idempotencyKey: key, signal });
    expect(Array.from(init.body.keys())).toEqual(["purpose", "photo"]);
    expect(init.body.get("purpose")).toBe("CHECK_IN");
    expect(init.body.get("photo")).toMatchObject({
      name: "attendance.jpg",
      type: "image/jpeg",
    });
  });
  it("blocks upload when location has expired, including the exact boundary", async () => {
    const api = vi.fn();
    const captured = photo();
    captured.location.capturedAt -= 61000;
    await expect(
      uploadPhoto(
        { api } as unknown as AuthClient,
        captured,
        "CHECK_IN",
        key,
        new AbortController().signal,
      ),
    ).rejects.toThrow("Perbarui lokasi");
    expect(api).not.toHaveBeenCalled();
  });
  it.each([
    { status: "PENDING" },
    { purpose: "CHECK_OUT" },
    { id: "bad" },
    { checksumSha256: "bad" },
    { byteSize: 0 },
    { width: 1281 },
  ])("rejects invalid READY metadata %j", async (invalid) => {
    const api = vi.fn().mockResolvedValue({ ...ready, ...invalid });
    await expect(
      uploadPhoto(
        { api } as unknown as AuthClient,
        photo(),
        "CHECK_IN",
        key,
        new AbortController().signal,
      ),
    ).rejects.toThrow("belum dapat dipastikan");
  });
  it("creates WIB evidence without changing instants and maps blink to AUTO", () => {
    const captured = photo();
    captured.capturedAt = Date.parse("2026-10-02T01:00:00.123Z");
    const evidence = prepareEvidence(captured, ready);
    expect(evidence.clientCapturedAt).toBe("2026-10-02T08:00:00.123+07:00");
    expect(Date.parse(evidence.location.capturedAt)).toBe(
      captured.location.capturedAt,
    );
    expect(evidence).toMatchObject({
      photoObjectId: ready.id,
      captureMethod: "AUTO",
      location: { accuracyMeters: 25 },
    });
    expect(
      prepareEvidence({ ...captured, method: "MANUAL" }, ready).captureMethod,
    ).toBe("MANUAL");
  });
  it("does not prepare attendance with an expired location after upload", () => {
    const captured = photo();
    expect(() =>
      prepareEvidence(captured, ready, captured.location.capturedAt + 60001),
    ).toThrow("Perbarui lokasi");
  });
});
