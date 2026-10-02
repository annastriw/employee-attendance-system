import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthError, type AuthClient } from "../../lib/auth-client";
import { useCheckIn, hasPendingCheckIn } from "./use-check-in";
const input = {
  photoObjectId: "ed1ee3a0-0da2-4529-8694-d5e6e582c063",
  clientCapturedAt: "2026-10-02T08:00:00.000+07:00",
  captureMethod: "AUTO" as const,
  location: {
    latitude: -6,
    longitude: 106,
    accuracyMeters: 25,
    capturedAt: "2026-10-02T08:00:00.000+07:00",
  },
};
const row = {
  id: "2f178ed8-8cf4-4aac-9dcb-805828295f88",
  attendanceDate: "2026-10-02",
  deletedAt: null,
  checkIn: {
    id: input.photoObjectId,
    eventTime: input.clientCapturedAt,
    isLate: false,
    isOutsideSchedule: false,
    reason: null,
  },
};
const envelope = { data: row };
function setup(api = vi.fn().mockResolvedValue(envelope)) {
  const client = { api } as unknown as AuthClient,
    expired = vi.fn();
  return {
    client,
    api,
    expired,
    ...renderHook(() => useCheckIn(client, expired)),
  };
}
describe("check-in intent recovery", () => {
  it("locks rapid double submits and accepts the server result", async () => {
    let finish!: (v: unknown) => void;
    const api = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result, client } = setup(api);
    await act(async () => {
      void result.current.submit(input);
      void result.current.submit(input);
    });
    expect(api).toHaveBeenCalledTimes(1);
    expect(hasPendingCheckIn(client)).toBe(true);
    await act(async () => {
      finish(envelope);
    });
    expect(result.current.record).toEqual(row);
    expect(result.current.pending).toBe(false);
    expect(hasPendingCheckIn(client)).toBe(false);
  });
  it("recovers a committed mutation after the POST response is lost without another POST", async () => {
    const api = vi
      .fn()
      .mockRejectedValueOnce(new AuthError(0, "network"))
      .mockResolvedValueOnce({
        data: { state: "SUCCEEDED", responseStatus: 201, response: envelope },
      });
    const { result } = setup(api);
    await act(async () => {
      await result.current.submit(input);
    });
    expect(result.current.record).toEqual(row);
    expect(api.mock.calls.map((c) => c[0])).toEqual([
      "me/attendance/check-in",
      expect.stringContaining("me/attendance/requests/"),
    ]);
  });
  it("keeps payload and key frozen when 404 leaves the outcome unknown, and resends only explicitly", async () => {
    const api = vi
      .fn()
      .mockRejectedValueOnce(new AuthError(0, "network"))
      .mockRejectedValueOnce(new AuthError(404, "not observed"))
      .mockResolvedValueOnce(envelope);
    const { result } = setup(api);
    const data = structuredClone(input);
    await act(async () => {
      await result.current.submit(data);
    });
    expect(result.current.pending).toBe(true);
    expect(api).toHaveBeenCalledTimes(2);
    data.location.latitude = 7;
    await act(async () => {
      await result.current.submit({ ...data, reason: "changed" });
    });
    expect(api.mock.calls[2][1].body).toEqual(input);
    expect(api.mock.calls[2][1].idempotencyKey).toBe(
      api.mock.calls[0][1].idempotencyKey,
    );
  });
  it("allows corrected input with a new key only after a durable reason rejection", async () => {
    const api = vi
      .fn()
      .mockRejectedValueOnce(new AuthError(422, "reason", "REASON_REQUIRED"))
      .mockResolvedValueOnce({
        data: {
          state: "REJECTED",
          responseStatus: 422,
          response: {
            error: { code: "REASON_REQUIRED", message: "Isi alasan." },
          },
        },
      })
      .mockResolvedValueOnce(envelope);
    const { result } = setup(api);
    await act(async () => {
      await result.current.submit(input);
    });
    expect(result.current.code).toBe("REASON_REQUIRED");
    expect(result.current.pending).toBe(false);
    await act(async () => {
      await result.current.submit({ ...input, reason: "Kendala jaringan" });
    });
    expect(api.mock.calls[2][1].idempotencyKey).not.toBe(
      api.mock.calls[0][1].idempotencyKey,
    );
  });
  it("retains unknown intent across route unmount and ignores late responses", async () => {
    let finish!: (v: unknown) => void;
    const api = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce({
        data: { state: "SUCCEEDED", responseStatus: 201, response: envelope },
      });
    const { client, result, unmount, expired } = setup(api);
    await act(async () => {
      void result.current.submit(input);
    });
    const signal = api.mock.calls[0][1].signal as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      finish(envelope);
    });
    expect(hasPendingCheckIn(client)).toBe(true);
    const next = renderHook(() => useCheckIn(client, expired));
    expect(next.result.current.pending).toBe(true);
    await act(async () => {
      await next.result.current.check();
    });
    expect(next.result.current.record).toEqual(row);
  });
  it("never opens revision for an unverified response or pending state", async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce({ data: {} })
      .mockResolvedValueOnce({
        data: { state: "PENDING", responseStatus: 0, response: null },
      });
    const { result } = setup(api);
    await act(async () => {
      await result.current.submit(input);
    });
    expect(result.current.pending).toBe(true);
    expect(result.current.record).toBeNull();
  });
  it("clears intent on revoked session without retry", async () => {
    const { result, expired, api, client } = setup(
      vi.fn().mockRejectedValue(new AuthError(401, "revoked")),
    );
    await act(async () => {
      await result.current.submit(input);
    });
    expect(expired).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledTimes(1);
    expect(hasPendingCheckIn(client)).toBe(false);
  });
  it("permits correcting a DTO rejected before the intent was created", async () => {
    const { result, api } = setup(
      vi
        .fn()
        .mockRejectedValue(
          new AuthError(400, "Periksa data", "VALIDATION_ERROR"),
        ),
    );
    await act(async () => {
      await result.current.submit(input);
    });
    expect(result.current.pending).toBe(false);
    expect(api).toHaveBeenCalledTimes(1);
  });
  it("T22 preserves checkout operation and target across remount and refuses a check-in result", async () => {
    const api = vi
      .fn()
      .mockRejectedValueOnce(new AuthError(0, "lost"))
      .mockRejectedValueOnce(new AuthError(404, "unknown"));
    const client = { api } as unknown as AuthClient,
      expired = vi.fn();
    const first = renderHook(() => useCheckIn(client, expired, "CHECK_OUT"));
    await act(async () =>
      first.result.current.submit({ ...input, dailyRecordId: row.id }),
    );
    expect(api.mock.calls[0][0]).toBe("me/attendance/check-out");
    const key = api.mock.calls[0][1].idempotencyKey;
    first.unmount();
    const next = renderHook(() => useCheckIn(client, expired, "CHECK_OUT"));
    api
      .mockResolvedValueOnce(envelope)
      .mockRejectedValueOnce(new AuthError(404, "unknown"));
    await act(async () => next.result.current.submit());
    expect(next.result.current.record).toBe(null);
    expect(next.result.current.pending).toBe(true);
    expect(api.mock.calls[2][1]).toMatchObject({
      idempotencyKey: key,
      body: { dailyRecordId: row.id },
    });
    const completed = {
      ...row,
      checkOut: { ...row.checkIn, isEarlyDeparture: false },
    };
    api.mockResolvedValueOnce({
      data: {
        state: "SUCCEEDED",
        responseStatus: 201,
        response: { data: completed },
      },
    });
    await act(async () => next.result.current.check());
    expect(next.result.current.record?.checkOut).toEqual(completed.checkOut);
    next.unmount();
  });
});
