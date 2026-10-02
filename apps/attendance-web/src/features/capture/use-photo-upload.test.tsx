import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthError, type AuthClient } from "../../lib/auth-client";
import { usePhotoUpload } from "./use-photo-upload";
import type { CapturedPhoto, ReadyPhoto } from "./photo-upload";

const ready: ReadyPhoto = {
  id: "ed1ee3a0-0da2-4529-8694-d5e6e582c063",
  status: "READY",
  purpose: "CHECK_IN",
  checksumSha256: "a".repeat(64),
  byteSize: 100,
  width: 640,
  height: 480,
};
function photo(): CapturedPhoto {
  return {
    blob: new Blob(["jpeg"], { type: "image/jpeg" }),
    url: "blob:photo",
    method: "MANUAL",
    capturedAt: Date.now(),
    location: {
      latitude: -6,
      longitude: 106,
      accuracy: 20,
      capturedAt: Date.now(),
    },
  };
}
function setup(api = vi.fn().mockResolvedValue(ready)) {
  const expired = vi.fn();
  const client = { api } as unknown as AuthClient;
  const capture = photo();
  return {
    api,
    expired,
    capture,
    ...renderHook(
      ({ value }: { value: CapturedPhoto | null }) =>
        usePhotoUpload(client, value, "CHECK_IN", expired),
      { initialProps: { value: capture as CapturedPhoto | null } },
    ),
  };
}
describe("photo upload lifecycle", () => {
  it("locks rapid double submits and retries the same bytes with the same key", async () => {
    let finish!: (value: ReadyPhoto) => void;
    const api = vi
      .fn()
      .mockRejectedValueOnce(new AuthError(0, "network"))
      .mockImplementationOnce(
        () =>
          new Promise<ReadyPhoto>((resolve) => {
            finish = resolve;
          }),
      );
    const { result } = setup(api);
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.upload?.error).toContain("belum dapat dipastikan");
    await act(async () => {
      void result.current.save();
      void result.current.save();
    });
    expect(api).toHaveBeenCalledTimes(2);
    expect(api.mock.calls[0][1].idempotencyKey).toBe(
      api.mock.calls[1][1].idempotencyKey,
    );
    await act(async () => {
      finish(ready);
    });
    expect(result.current.upload?.ready).toEqual(ready);
  });
  it("retains READY when only location is refreshed, and clears it for a new photo", async () => {
    const { result, capture, rerender, api } = setup();
    await act(async () => {
      await result.current.save();
    });
    rerender({
      value: {
        ...capture,
        location: { ...capture.location, capturedAt: Date.now() + 1000 },
      },
    });
    expect(result.current.upload?.ready).toEqual(ready);
    expect(api).toHaveBeenCalledTimes(1);
    const originalKey = api.mock.calls[0][1].idempotencyKey;
    rerender({ value: photo() });
    expect(result.current.upload).toBeNull();
    await act(async () => {
      await result.current.save();
    });
    expect(api.mock.calls[1][1].idempotencyKey).not.toBe(originalKey);
  });
  it("aborts on leaving and ignores late responses", async () => {
    let finish!: (value: ReadyPhoto) => void;
    const api = vi.fn().mockImplementation(
      () =>
        new Promise<ReadyPhoto>((resolve) => {
          finish = resolve;
        }),
    );
    const { result, rerender } = setup(api);
    await act(async () => {
      void result.current.save();
    });
    const signal = api.mock.calls[0][1].signal as AbortSignal;
    rerender({ value: null });
    expect(signal.aborted).toBe(true);
    await act(async () => {
      finish(ready);
    });
    expect(result.current.upload).toBeNull();
  });
  it("aborts pending upload on pagehide", async () => {
    const api = vi.fn().mockImplementation(() => new Promise(() => {}));
    const { result } = setup(api);
    await act(async () => {
      void result.current.save();
    });
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(api.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it("returns revoked sessions to login and never retries automatically", async () => {
    const { result, expired, api } = setup(
      vi.fn().mockRejectedValue(new AuthError(401, "revoked")),
    );
    await act(async () => {
      await result.current.save();
    });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledTimes(1);
  });
});
