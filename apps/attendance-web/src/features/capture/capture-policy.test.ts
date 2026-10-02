import { describe, expect, it } from "vitest";
import { BlinkGate, evaluateFaces, isFreshLocation, type FaceObservation } from "./capture-policy";

const face: FaceObservation = { confidence: 0.9, box: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 } };
describe("face capture eligibility", () => {
  it("requires exactly one confident face inside the guide", () => {
    expect(evaluateFaces([])).toBe("none");
    expect(evaluateFaces([face, { ...face, confidence: 0.4 }])).toBe("multiple");
    expect(evaluateFaces([{ ...face, confidence: 0.79 }])).toBe("uncertain");
    expect(evaluateFaces([{ ...face, confidence: 0.8 }])).toBe("valid");
    expect(evaluateFaces([{ ...face, box: { ...face.box, x: 0 } }])).toBe("position");
    expect(evaluateFaces([{ ...face, box: { ...face.box, height: NaN } }])).toBe("position");
  });
});

function stableGate() {
  const gate = new BlinkGate();
  for (let t = 0; t <= 800; t += 100) gate.update(t, true, 0.1, 0.1);
  return gate;
}
describe("blink capture", () => {
  it("waits for stability then captures on both eyes reopening", () => {
    const gate = stableGate();
    expect(gate.update(900, true, 0.7, 0.7).blink).toBe(false);
    expect(gate.update(1000, true, 0.1, 0.1).blink).toBe(true);
    expect(gate.update(1100, true, 0.1, 0.1).blink).toBe(false);
  });
  it("does not accept a wink or initially closed eyes", () => {
    const wink = stableGate();
    wink.update(900, true, 0.7, 0.1);
    expect(wink.update(1000, true, 0.1, 0.1).blink).toBe(false);
    const closed = new BlinkGate();
    for (let t = 0; t <= 900; t += 100) closed.update(t, true, 0.8, 0.8);
    expect(closed.update(1000, true, 0.1, 0.1).blink).toBe(false);
  });
  it("resets after losing a valid face or a stalled frame", () => {
    for (const invalid of [true, false]) {
      const gate = stableGate();
      gate.update(900, true, 0.7, 0.7);
      if (invalid) gate.update(1000, false, 0.1, 0.1);
      expect(gate.update(invalid ? 1100 : 1401, true, 0.1, 0.1)).toEqual({ stable: false, blink: false });
    }
  });
  it("rejects prolonged eye closure and a too-short blink", () => {
    const held = stableGate();
    for (let t = 900; t <= 2000; t += 100) held.update(t, true, 0.8, 0.8);
    expect(held.update(2100, true, 0.1, 0.1).blink).toBe(false);
    const fast = stableGate();
    fast.update(900, true, 0.8, 0.8);
    expect(fast.update(950, true, 0.1, 0.1).blink).toBe(false);
  });
});
describe("mandatory fresh location", () => {
  const location = { latitude: -6, longitude: 106, accuracy: 25, capturedAt: 100_000 };
  it("accepts fresh coordinates and exact age limit, without geofencing", () => {
    expect(isFreshLocation(location, 160_000)).toBe(true);
    expect(isFreshLocation({ ...location, accuracy: 5000 }, 100_000)).toBe(true);
    expect(isFreshLocation(location, 160_001)).toBe(false);
    expect(isFreshLocation(null, 100_000)).toBe(false);
  });
  it("rejects invalid coordinates, accuracy and future timestamps", () => {
    for (const patch of [{ latitude: 91 }, { longitude: 181 }, { accuracy: -1 }, { accuracy: NaN }, { capturedAt: Infinity }, { capturedAt: 105_001 }]) {
      expect(isFreshLocation({ ...location, ...patch }, 100_000)).toBe(false);
    }
  });
});
