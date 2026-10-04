import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CaptureSpike } from "./CaptureSpike";

const mocks = vi.hoisted(() => ({
  load: vi.fn(), inspect: vi.fn(), close: vi.fn(), media: vi.fn(),
  stop: vi.fn(), trackListener: vi.fn(), locate: vi.fn(), photograph: vi.fn(),
}));
vi.mock("../../../src/features/capture/vision", () => ({ loadVision: mocks.load }));
vi.mock("../../../src/features/capture/browser-capture", async importOriginal => ({
  ...await importOriginal<typeof import("../../../src/features/capture/browser-capture")>(),
  requestLocation: mocks.locate, photograph: mocks.photograph,
}));
const validFace = { confidence: 0.9, box: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 } };
const valid = { faces: [validFace], landmarkCount: 1, left: 0.1, right: 0.1 };
const fresh = () => ({ latitude: -6, longitude: 106, accuracy: 25, capturedAt: Date.now() });
let previousMedia: PropertyDescriptor | undefined;
let previousCreate: typeof URL.createObjectURL;
let previousRevoke: typeof URL.revokeObjectURL;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "performance", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
  vi.resetAllMocks();
  vi.stubGlobal("isSecureContext", true);
  mocks.load.mockResolvedValue({ inspect: mocks.inspect, close: mocks.close });
  mocks.inspect.mockReturnValue(valid);
  mocks.media.mockResolvedValue({ getTracks: () => [{ stop: mocks.stop }], getVideoTracks: () => [{ addEventListener: mocks.trackListener }] });
  mocks.locate.mockImplementation(() => Promise.resolve(fresh()));
  mocks.photograph.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
  previousMedia = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: mocks.media } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(4);
  vi.spyOn(HTMLMediaElement.prototype, "currentTime", "get").mockImplementation(() => performance.now() / 1000);
  vi.spyOn(HTMLVideoElement.prototype, "videoWidth", "get").mockReturnValue(640);
  vi.spyOn(HTMLVideoElement.prototype, "videoHeight", "get").mockReturnValue(480);
  previousCreate = URL.createObjectURL;
  previousRevoke = URL.revokeObjectURL;
  URL.createObjectURL = vi.fn(() => "blob:spike-photo");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  if (previousMedia) Object.defineProperty(navigator, "mediaDevices", previousMedia);
  else Reflect.deleteProperty(navigator, "mediaDevices");
  URL.createObjectURL = previousCreate;
  URL.revokeObjectURL = previousRevoke;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function begin(ms = 900) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Mulai" }));
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("capture spike behavior (simulated devices)", () => {
  it("does not request camera/location until a user action and blocks insecure contexts", async () => {
    vi.stubGlobal("isSecureContext", false);
    render(<CaptureSpike />);
    expect(mocks.load).not.toHaveBeenCalled();
    await begin(0);
    expect(screen.getByRole("alert")).toHaveTextContent("HTTPS");
    expect(mocks.media).not.toHaveBeenCalled();
    expect(mocks.locate).not.toHaveBeenCalled();
  });
  it("model failure blocks all capture and supports retry", async () => {
    mocks.load.mockRejectedValueOnce(new Error("network"));
    render(<CaptureSpike />);
    await begin(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Model wajah gagal");
    expect(mocks.media).not.toHaveBeenCalled();
    await begin();
    expect(screen.getByRole("button", { name: "Ambil foto" })).toBeEnabled();
  });
  it("reports camera denial and closes the loaded models", async () => {
    mocks.media.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    render(<CaptureSpike />);
    await begin(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Izin kamera ditolak");
    expect(mocks.close).toHaveBeenCalledTimes(1);
    expect(mocks.locate).not.toHaveBeenCalled();
  });
  it("blocks manual capture when location is denied, then enables after retry", async () => {
    mocks.locate.mockRejectedValueOnce(new Error("Izin lokasi ditolak."));
    render(<CaptureSpike />);
    await begin();
    expect(screen.getByRole("button", { name: "Ambil foto" })).toBeDisabled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Coba lokasi lagi" })); });
    expect(screen.getByRole("button", { name: "Ambil foto" })).toBeEnabled();
  });
  it("requires a stable single face for manual fallback", async () => {
    mocks.inspect.mockReturnValue({ ...valid, faces: [validFace, validFace] });
    render(<CaptureSpike />);
    await begin();
    expect(screen.getByRole("button", { name: "Ambil foto" })).toBeDisabled();
    mocks.inspect.mockReturnValue(valid);
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(screen.getByRole("button", { name: "Ambil foto" })).toBeEnabled();
  });
  it("captures one JPEG on blink, stops tracks and clears preview on retake", async () => {
    render(<CaptureSpike />);
    await begin();
    mocks.inspect.mockReturnValue({ ...valid, left: 0.7, right: 0.7 });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    mocks.inspect.mockReturnValue(valid);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByAltText("Preview foto hasil capture")).toBeVisible();
    expect(mocks.photograph).toHaveBeenCalledTimes(1);
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(mocks.close).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ambil ulang" }));
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:spike-photo");
    expect(screen.queryByAltText("Preview foto hasil capture")).not.toBeInTheDocument();
  });
  it("blocks capture with stale coordinates", async () => {
    render(<CaptureSpike />);
    await begin();
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
    expect(screen.getByRole("button", { name: "Ambil foto" })).toBeDisabled();
    expect(mocks.photograph).not.toHaveBeenCalled();
  });
  it("ignores late camera permission after stopping", async () => {
    let resolve!: (stream: { getTracks: () => { stop: () => void }[] }) => void;
    mocks.media.mockReturnValue(new Promise(r => { resolve = r; }));
    render(<CaptureSpike />);
    await begin(0);
    fireEvent.click(screen.getByRole("button", { name: "Hentikan" }));
    await act(async () => { resolve({ getTracks: () => [{ stop: mocks.stop }] }); });
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(mocks.locate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Mulai" })).toBeEnabled();
  });
  it("reports a disconnected camera and releases resources", async () => {
    render(<CaptureSpike />);
    await begin();
    act(() => { mocks.trackListener.mock.calls[0][1](); });
    expect(screen.getByRole("alert")).toHaveTextContent("Kamera terputus");
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });
  it("rejects capture while landmarks or blendshapes are missing", async () => {
    mocks.inspect.mockReturnValue({ ...valid, left: NaN });
    render(<CaptureSpike />);
    await begin();
    expect(screen.getByRole("button", { name: "Ambil foto" })).toBeDisabled();
  });
  it("ignores stale model initialization after a new session starts", async () => {
    let complete!: (value: { inspect: typeof mocks.inspect; close: () => void }) => void;
    const oldClose = vi.fn();
    mocks.load.mockReturnValueOnce(new Promise(resolve => { complete = resolve; }));
    render(<CaptureSpike />);
    await begin(0);
    fireEvent.click(screen.getByRole("button", { name: "Hentikan" }));
    await begin();
    await act(async () => { complete({ inspect: mocks.inspect, close: oldClose }); });
    expect(oldClose).toHaveBeenCalledTimes(1);
    expect(mocks.media).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Ambil foto" })).toBeEnabled();
  });
  it("releases camera on pagehide and on unmount", async () => {
    const view = render(<CaptureSpike />);
    await begin();
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    expect(mocks.stop).toHaveBeenCalledTimes(1);
    await begin();
    view.unmount();
    expect(mocks.stop).toHaveBeenCalledTimes(2);
  });
});
