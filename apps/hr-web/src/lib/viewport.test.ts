import { afterEach, describe, expect, it } from "vitest";
import { lockViewportZoom } from "../../../../packages/ui/src/theme/viewport";
let cleanup = () => {};
afterEach(() => { cleanup(); document.body.innerHTML = ""; });
describe("viewport zoom lock", () => {
  it.each(["+", "=", "-", "_", "0"])("blocks Ctrl/Cmd %s", (key) => {
    cleanup = lockViewportZoom();
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
      const e = new KeyboardEvent("keydown", { key, ...modifier, cancelable: true });
      window.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(true);
    }
  });
  it("blocks numpad zoom and Ctrl wheel but leaves ordinary keys, wheel and double click alone", () => {
    cleanup = lockViewportZoom();
    for (const code of ["NumpadAdd", "NumpadSubtract", "Numpad0"]) {
      const e = new KeyboardEvent("keydown", { code, ctrlKey: true, cancelable: true });
      window.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(true);
    }
    const zoom = new WheelEvent("wheel", { ctrlKey: true, cancelable: true });
    window.dispatchEvent(zoom);
    expect(zoom.defaultPrevented).toBe(true);
    for (const e of [new KeyboardEvent("keydown", { key: "+", cancelable: true }), new KeyboardEvent("keydown", { key: "k", ctrlKey: true, cancelable: true }), new WheelEvent("wheel", { cancelable: true }), new MouseEvent("dblclick", { cancelable: true })]) {
      window.dispatchEvent(e);
      expect(e.defaultPrevented).toBe(false);
    }
  });
  it("allows map pinch but blocks page pinch and Safari gestures, then cleans up listeners", () => {
    cleanup = lockViewportZoom();
    const map = document.createElement("div");
    map.dataset.allowZoom = "";
    const child = document.createElement("span");
    map.append(child); document.body.append(map);
    const touch = (target: Element, count: number) => {
      const e = new Event("touchmove", { bubbles: true, cancelable: true });
      Object.defineProperty(e, "touches", { value: { length: count } });
      target.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(touch(document.body, 2)).toBe(true);
    expect(touch(document.body, 1)).toBe(false);
    expect(touch(child, 2)).toBe(false);
    for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
      const e = new Event(type, { bubbles: true, cancelable: true });
      document.body.dispatchEvent(e); expect(e.defaultPrevented).toBe(true);
      const allowed = new Event(type, { bubbles: true, cancelable: true });
      child.dispatchEvent(allowed); expect(allowed.defaultPrevented).toBe(false);
    }
    cleanup();
    expect(touch(document.body, 2)).toBe(false);
    const e = new WheelEvent("wheel", { ctrlKey: true, cancelable: true });
    window.dispatchEvent(e); expect(e.defaultPrevented).toBe(false);
  });
});
