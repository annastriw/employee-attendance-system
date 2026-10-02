import { createRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError, type AuthClient } from "../../lib/auth-client";
import { CapturePanel } from "./CapturePanel";

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  locate: vi.fn(),
  take: vi.fn(),
}));
vi.mock("../../features/capture/use-capture", () => ({
  useCapture: mocks.capture,
}));
const client = { api: vi.fn() } as unknown as AuthClient;
const state = () => ({
  video: createRef<HTMLVideoElement>(),
  phase: "idle",
  error: "",
  frame: null,
  photo: null,
  location: null,
  locationFresh: false,
  locationError: "",
  locationBusy: false,
  manualReady: false,
  start: mocks.start,
  stop: mocks.stop,
  locate: mocks.locate,
  capture: mocks.take,
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.capture.mockReturnValue(state());
});
const props = {
  client,
  purpose: "CHECK_IN" as const,
  onBack: vi.fn(),
  onSessionExpired: vi.fn(),
};

describe("production capture controls", () => {
  it("requests no devices on mount and starts only after the explicit action", () => {
    render(<CapturePanel {...props} />);
    expect(mocks.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Buka kamera" }));
    expect(mocks.start).toHaveBeenCalledTimes(1);
  });
  it("shows denied location, blocks manual capture, and offers retry", () => {
    mocks.capture.mockReturnValue({
      ...state(),
      phase: "running",
      locationError: "Izin lokasi ditolak.",
    });
    render(<CapturePanel {...props} />);
    expect(screen.getByText("Izin lokasi ditolak.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Ambil foto" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Perbarui" }));
    expect(mocks.locate).toHaveBeenCalledTimes(1);
  });
  it("blocks preview submission without fresh location and retains retake", () => {
    mocks.capture.mockReturnValue({
      ...state(),
      phase: "preview",
      photo: {
        blob: new Blob(["jpeg"], { type: "image/jpeg" }),
        url: "blob:photo",
        method: "MANUAL",
        capturedAt: Date.now(),
        location: {
          latitude: -6,
          longitude: 106,
          accuracy: 20,
          capturedAt: Date.now() - 61000,
        },
      },
    });
    render(<CapturePanel {...props} />);
    expect(
      screen.getByRole("button", { name: "Kirim check-in" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Ambil ulang" }));
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(client.api).not.toHaveBeenCalled();
  });
  it("offers camera retry after a permission failure and releases on back", () => {
    mocks.capture.mockReturnValue({
      ...state(),
      phase: "error",
      error: "Izin kamera ditolak.",
    });
    render(<CapturePanel {...props} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Izin kamera ditolak.");
    fireEvent.click(screen.getByRole("button", { name: "Kembali ke beranda" }));
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  const ready = {
    id: "ed1ee3a0-0da2-4529-8694-d5e6e582c063",
    status: "READY",
    purpose: "CHECK_IN",
    checksumSha256: "a".repeat(64),
    byteSize: 100,
    width: 640,
    height: 480,
  };
  const record = {
    id: "2f178ed8-8cf4-4aac-9dcb-805828295f88",
    attendanceDate: "2026-10-02",
    deletedAt: null,
    checkIn: {
      id: ready.id,
      eventTime: "2026-10-02T08:01:00.000+07:00",
      isLate: true,
      isOutsideSchedule: false,
      reason: "Jaringan",
    },
  };
  function preview() {
    const location = {
      latitude: -6,
      longitude: 106,
      accuracy: 25,
      capturedAt: Date.now(),
    };
    return {
      ...state(),
      phase: "preview",
      locationFresh: true,
      location,
      photo: {
        blob: new Blob(["jpeg"], { type: "image/jpeg" }),
        url: "blob:photo",
        method: "BLINK",
        capturedAt: Date.now(),
        location,
      },
    };
  }
  it("uploads private evidence once then submits only the photo ID and fresh location with a separate intent", async () => {
    mocks.capture.mockReturnValue(preview());
    const api = vi
      .fn()
      .mockResolvedValueOnce(ready)
      .mockResolvedValueOnce({ data: record });
    render(
      <CapturePanel {...props} client={{ api } as unknown as AuthClient} />,
    );
    const button = screen.getByRole("button", { name: "Kirim check-in" });
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByRole("heading", { name: "Check-in tercatat" });
    expect(api).toHaveBeenCalledTimes(2);
    expect(api.mock.calls[0][1].body).toBeInstanceOf(FormData);
    expect(api.mock.calls[1][1].body).toMatchObject({
      photoObjectId: ready.id,
      captureMethod: "AUTO",
      location: { latitude: -6, longitude: 106 },
    });
    expect(api.mock.calls[1][1].body).not.toHaveProperty("purpose");
    expect(api.mock.calls[1][1].body).not.toHaveProperty("employeeId");
    expect(api.mock.calls[1][1].idempotencyKey).not.toBe(
      api.mock.calls[0][1].idempotencyKey,
    );
  });
  it("requires a nonblank late reason before uploading and focuses the field", async () => {
    mocks.capture.mockReturnValue(preview());
    const api = vi.fn();
    render(
      <CapturePanel
        {...props}
        reasonRequired
        client={{ api } as unknown as AuthClient}
      />,
    );
    fireEvent.change(screen.getByLabelText("Alasan terlambat"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kirim check-in" }));
    expect(screen.getByLabelText("Alasan terlambat")).toHaveFocus();
    expect(api).not.toHaveBeenCalled();
  });
  it("preserves READY evidence at the late boundary and resubmits a corrected reason without another upload", async () => {
    mocks.capture.mockReturnValue(preview());
    const api = vi
      .fn()
      .mockResolvedValueOnce(ready)
      .mockRejectedValueOnce(new AuthError(422, "late", "REASON_REQUIRED"))
      .mockResolvedValueOnce({
        data: {
          state: "REJECTED",
          responseStatus: 422,
          response: {
            error: { code: "REASON_REQUIRED", message: "Isi alasan." },
          },
        },
      })
      .mockResolvedValueOnce({ data: record });
    render(
      <CapturePanel {...props} client={{ api } as unknown as AuthClient} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Kirim check-in" }));
    const field = await screen.findByLabelText("Alasan terlambat");
    await waitFor(() => expect(field).toHaveFocus());
    fireEvent.change(field, { target: { value: "Jaringan" } });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Kirim check-in" }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Kirim check-in" }));
    await screen.findByRole("heading", { name: "Check-in tercatat" });
    expect(
      api.mock.calls.filter((c) => c[0] === "media/attendance-photos"),
    ).toHaveLength(1);
    expect(api.mock.calls[3][1].body.reason).toBe("Jaringan");
  });
  it("locks retake and location changes when an unobserved request still has an unknown outcome", async () => {
    mocks.capture.mockReturnValue(preview());
    const api = vi
      .fn()
      .mockResolvedValueOnce(ready)
      .mockRejectedValueOnce(new AuthError(0, "network"))
      .mockRejectedValueOnce(new AuthError(404, "unobserved"));
    render(
      <CapturePanel {...props} client={{ api } as unknown as AuthClient} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Kirim check-in" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Cek hasil" })).toBeEnabled(),
    );
    expect(
      screen.queryByRole("button", { name: "Ambil ulang" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Perbarui" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Kembali ke beranda" }),
    ).toBeDisabled();
  });

  it("refreshes stale location after upload without reuploading READY bytes", async () => {
    const captured = preview();
    mocks.capture.mockReturnValue(captured);
    const api = vi
      .fn()
      .mockImplementationOnce(async () => {
        captured.photo.location = {
          ...captured.photo.location,
          capturedAt: Date.now() - 61000,
        };
        return ready;
      })
      .mockResolvedValueOnce({ data: record });
    const panel = render(
      <CapturePanel {...props} client={{ api } as unknown as AuthClient} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Kirim check-in" }));
    await screen.findByText("Perbarui lokasi sebelum mengirim absensi.");
    expect(api).toHaveBeenCalledTimes(1);
    captured.photo.location = {
      ...captured.photo.location,
      capturedAt: Date.now(),
    };
    panel.rerender(
      <CapturePanel {...props} client={{ api } as unknown as AuthClient} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Kirim check-in" }));
    await screen.findByRole("heading", { name: "Check-in tercatat" });
    expect(
      api.mock.calls.filter((c) => c[0] === "media/attendance-photos"),
    ).toHaveLength(1);
  });
  it("T22 requires early reason and submits new checkout evidence with the frozen daily target", async () => {
    mocks.capture.mockReturnValue(preview());
    const output = {
      ...record,
      checkOut: {
        ...record.checkIn,
        id: "554d6a1b-2f3b-44a8-9a87-7a2d4d8bb8f0",
        eventTime: "2026-10-02T16:30:00.000+07:00",
        isEarlyDeparture: true,
        reason: "Urusan keluarga",
      },
    };
    const api = vi
      .fn()
      .mockResolvedValueOnce({ ...ready, purpose: "CHECK_OUT" })
      .mockResolvedValueOnce({ data: output });
    render(
      <CapturePanel
        {...props}
        client={{ api } as unknown as AuthClient}
        purpose="CHECK_OUT"
        dailyRecordId={record.id}
        reasonRequired
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Kirim checkout" }));
    expect(screen.getByLabelText("Alasan pulang awal")).toHaveFocus();
    expect(api).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Alasan pulang awal"), {
      target: { value: " Urusan keluarga " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Kirim checkout" }));
    await screen.findByRole("heading", { name: "Checkout tercatat" });
    expect(api.mock.calls[0][1].body.get("purpose")).toBe("CHECK_OUT");
    expect(api.mock.calls[1][0]).toBe("me/attendance/check-out");
    expect(api.mock.calls[1][1].body).toMatchObject({
      dailyRecordId: record.id,
      reason: "Urusan keluarga",
      photoObjectId: ready.id,
    });
    expect(screen.getByText("Pulang lebih awal")).toBeVisible();
  });
});
