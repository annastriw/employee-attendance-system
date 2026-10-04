import { describe, expect, it } from "vitest";
import { openStreetMapUrl } from "./map-link";

describe("attendance map fallback", () => {
  it("preserves the recorded coordinates in the external map URL", () => {
    expect(openStreetMapUrl(-6.2088, 106.8456)).toBe(
      "https://www.openstreetmap.org/?mlat=-6.2088&mlon=106.8456#map=16/-6.2088/106.8456",
    );
  });
});
