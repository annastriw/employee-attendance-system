import { describe, expect, it, vi } from "vitest";
import type { AuthClient } from "./auth-client";
import { getToday, getCheckInStatus, readRecord } from "./attendance-client";
const id = "ed1ee3a0-0da2-4529-8694-d5e6e582c063";
const row = {
  id,
  attendanceDate: "2026-10-02",
  deletedAt: null,
  checkIn: {
    id,
    eventTime: "2026-10-02T08:01:00.000+07:00",
    isLate: true,
    isOutsideSchedule: false,
    reason: "Jaringan",
  },
};
const today = {
  employeeName: "Synthetic",
  attendanceDate: "2026-10-02",
  eligible: true,
  ineligibilityMessage: null,
  schedule: { type: "REGULAR_WORKDAY", start: "08:00:00", end: "17:00:00" },
  reasonRequired: true,
  checkoutReasonRequired: true,
  status: "CHECKED_IN",
  record: row,
};
const meta = { requestId: id, serverTime: "2026-10-02T08:01:00.000+07:00" };
const client = (data: unknown) =>
  ({ api: vi.fn().mockResolvedValue({ data, meta }) }) as unknown as AuthClient;
describe("Attendance API response validation", () => {
  it.each(['3b81c559-bfef-11f1-85c7-76e03cd5f3d3', '1b5558fb-c9b3-5db5-864a-4455374a9234'])(
    'accepts database UUID %s in today, event and operation results', async databaseId => {
      const value = { ...row, id: databaseId, checkIn: { ...row.checkIn, id: databaseId } };
      expect((await getToday(client({ ...today, record: value }))).data.record?.id).toBe(databaseId);
      expect(readRecord(value).checkIn.id).toBe(databaseId);
      const result = await getCheckInStatus(client({ state: 'SUCCEEDED', responseStatus: 201, response: { data: value } }), id, new AbortController().signal);
      expect(result.response?.data).toEqual(value);
    },
  );
  it.each(['not-a-uuid', '3b81c559-bfef-11f1-05c7-76e03cd5f3d3'])(
    'rejects malformed database UUID %s', async databaseId => {
      await expect(getToday(client({ ...today, record: { ...row, id: databaseId } }))).rejects.toThrow('diverifikasi');
    },
  );
  it.each(['2026-02-30', '2026-13-01'])(
    'rejects impossible calendar date %s in today and operation records', async attendanceDate => {
      const value = { ...row, attendanceDate };
      await expect(getToday(client({ ...today, attendanceDate, record: value }))).rejects.toThrow('diverifikasi');
      expect(() => readRecord(value)).toThrow('diverifikasi');
    },
  );
  it("accepts official WIB results independently of the device calendar", async () => {
    expect((await getToday(client(today))).data.record).toEqual(row);
  });
  it("does not accept an event for a different attendance date as today", async () => {
    await expect(
      getToday(
        client({ ...today, record: { ...row, attendanceDate: "2026-10-01" } }),
      ),
    ).rejects.toThrow("diverifikasi");
  });
  it("validates deleted-event time before it can reach date formatting in the UI", async () => {
    await expect(
      getToday(
        client({
          ...today,
          status: "DELETED",
          record: {
            ...row,
            deletedAt: meta.serverTime,
            checkIn: { ...row.checkIn, eventTime: "invalid" },
          },
        }),
      ),
    ).rejects.toThrow("diverifikasi");
    expect(
      (
        await getToday(
          client({
            ...today,
            status: "DELETED",
            record: { ...row, deletedAt: meta.serverTime },
          }),
        )
      ).data.status,
    ).toBe("DELETED");
  });
  it("does not treat a mismatched HTTP status as a verified reconciliation success", async () => {
    await expect(
      getCheckInStatus(
        client({
          state: "SUCCEEDED",
          responseStatus: 503,
          response: { data: row },
        }),
        id,
        new AbortController().signal,
      ),
    ).rejects.toThrow("diverifikasi");
  });
  it("does not open revision for an invalid terminal state response", async () => {
    await expect(
      getCheckInStatus(
        client({ state: "REJECTED", responseStatus: 201, response: {} }),
        id,
        new AbortController().signal,
      ),
    ).rejects.toThrow("diverifikasi");
  });
  it("T22 requires a valid checkout in completed today and rejects malformed official checkout time", async () => {
    const completed = {
      ...today,
      checkoutReasonRequired: false,
      status: "CHECKED_OUT",
      record: {
        ...row,
        checkOut: {
          ...row.checkIn,
          isEarlyDeparture: false,
          eventTime: "2026-10-02T17:00:00.000+07:00",
        },
      },
    };
    expect((await getToday(client(completed))).data.status).toBe("CHECKED_OUT");
    await expect(
      getToday(client({ ...completed, record: row })),
    ).rejects.toThrow();
    await expect(
      getToday(
        client({
          ...completed,
          record: {
            ...completed.record,
            checkOut: { ...completed.record.checkOut, eventTime: "bad" },
          },
        }),
      ),
    ).rejects.toThrow();
  });
});
