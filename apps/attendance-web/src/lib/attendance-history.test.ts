import { describe, expect, it, vi } from "vitest";
import type { AuthClient } from "./auth-client";
import { getHistory, getHistoryDetail } from "./attendance-history";

const recordId = "1b5558fb-c9b3-5db5-864a-4455374a9234";
const eventId = "51f15cc4-d49e-599b-a71b-02839e2a5443";
const meta = {
  requestId: "50f96add-c545-4500-ab47-96b8be447f38",
  serverTime: "2026-10-05T04:09:34.737+07:00",
};
function record(id = recordId, checkInId = eventId) {
  return {
    id,
    attendanceDate: "2026-09-30",
    department: "Engineering",
    position: "Developer",
    deletedAt: null,
    deleteReason: null,
    checkIn: {
      id: checkInId,
      eventTime: "2026-09-30T07:59:00.000+07:00",
      reason: null,
      isLate: false,
      isEarlyDeparture: false,
      isOutsideSchedule: false,
      location: {
        latitude: -6,
        longitude: 106,
        accuracyMeters: 25,
        capturedAt: "2026-09-30T07:58:50.000+07:00",
      },
      captureMethod: "MANUAL",
    },
    checkOut: null,
  };
}
const signal = () => new AbortController().signal;
function clientFor(data: unknown, detail = false) {
  return {
    api: vi.fn().mockResolvedValue({
      data: detail ? data : [data],
      meta: { ...meta, total: 1, page: 1, pageSize: 20 },
    }),
  } as unknown as AuthClient;
}

describe("attendance history UUID compatibility", () => {
  it("accepts an uppercase URL UUID matching the returned record", async () => {
    expect((await getHistoryDetail(clientFor(record(), true), recordId.toUpperCase(), signal())).id).toBe(recordId);
  });
  it('accepts v1 database record/event IDs in both list and detail', async () => {
    const id = '3b81c559-bfef-11f1-85c7-76e03cd5f3d3';
    expect((await getHistory(clientFor(record(id, id)), new URLSearchParams(), signal())).data[0].id).toBe(id);
    expect((await getHistoryDetail(clientFor(record(id, id), true), id, signal())).checkIn.id).toBe(id);
  });
  it("accepts seeded UUID v5 record and event IDs in a successful list response", async () => {
    const result = await getHistory(clientFor(record()), new URLSearchParams(), signal());
    expect(result.data[0].id).toBe(recordId);
    expect(result.data[0].checkIn.id).toBe(eventId);
    expect(result.data[0].checkIn.location).toBeUndefined();
  });

  it("accepts seeded UUID v5 detail including checkout evidence", async () => {
    const value = record();
    const detail = {
      ...value,
      checkOut: {
        ...value.checkIn,
        id: "b5dbe662-6ab6-58c1-b957-7a33df58dd35",
        eventTime: "2026-09-30T17:00:00.000+07:00",
      },
    };
    const result = await getHistoryDetail(clientFor(detail, true), recordId, signal());
    expect(result.checkOut?.id).toBe(detail.checkOut.id);
    expect(result.checkIn.location?.latitude).toBe(-6);
  });

  it("continues accepting live UUID v4 IDs", async () => {
    const value = record("11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222");
    const result = await getHistory(clientFor(value), new URLSearchParams(), signal());
    expect(result.data[0].id).toBe(value.id);
  });

  it.each([
    "not-a-uuid",
    "1b5558fb-c9b3-5db5-064a-4455374a9234",
    "1b5558fb-c9b3-0db5-864a-4455374a9234",
  ])("rejects invalid record and event identifiers: %s", async (id) => {
    for (const value of [record(id), record(recordId, id)]) {
      await expect(getHistory(clientFor(value), new URLSearchParams(), signal())).rejects.toThrow("Riwayat absensi belum dapat diverifikasi.");
    }
  });

  it("still rejects invalid location evidence for UUID v5 detail", async () => {
    const value = record();
    value.checkIn.location.latitude = 91;
    await expect(getHistoryDetail(clientFor(value, true), recordId, signal())).rejects.toThrow("Riwayat absensi belum dapat diverifikasi.");
  });

  it("still rejects a detail response belonging to a different record", async () => {
    await expect(getHistoryDetail(clientFor(record(), true), "0ff7464d-6e0e-573a-b249-c40ae6981a5d", signal())).rejects.toThrow("Riwayat absensi belum dapat diverifikasi.");
  });
});
