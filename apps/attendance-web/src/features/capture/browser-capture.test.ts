import { afterEach, describe, expect, it, vi } from "vitest";
import { requestLocation, photograph } from "./browser-capture";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("browser device boundary", () => {
  it("requests uncached high-accuracy coordinates with a timeout", async () => {
    vi.stubGlobal("isSecureContext", true);
    const getCurrentPosition = vi.fn(success => success({
      coords: { latitude: -6, longitude: 106, accuracy: 15 }, timestamp: Date.now(),
    }));
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    try {
      await expect(requestLocation()).resolves.toMatchObject({ latitude: -6, longitude: 106, accuracy: 15 });
      expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 });
    } finally {
      if (descriptor) Object.defineProperty(navigator, "geolocation", descriptor);
      else Reflect.deleteProperty(navigator, "geolocation");
    }
  });
  it("does not create a photo without a video frame", async () => {
    await expect(photograph(document.createElement("video"))).rejects.toThrow("Frame kamera");
  });
});
