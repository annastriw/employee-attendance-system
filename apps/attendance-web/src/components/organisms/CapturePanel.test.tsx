import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient } from "../../lib/auth-client";
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
    expect(screen.getByRole("button", { name: "Simpan foto" })).toBeDisabled();
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
});
