/** Prevent page zoom while allowing multi-touch interactions inside map canvases. */
export function lockViewportZoom(): () => void {
  if (typeof window === "undefined") return () => {};
  const options = { passive: false, capture: true };
  const inMap = (event: Event) =>
    event.composedPath().some((target) => target instanceof Element && target.matches("[data-allow-zoom]"));
  const keydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) &&
      (["+", "=", "-", "_", "0"].includes(event.key) ||
        ["NumpadAdd", "NumpadSubtract", "Numpad0"].includes(event.code))) event.preventDefault();
  };
  const wheel = (event: WheelEvent) => { if (event.ctrlKey) event.preventDefault(); };
  const gesture = (event: Event) => { if (!inMap(event)) event.preventDefault(); };
  const touchmove = (event: TouchEvent) => {
    if (event.touches.length > 1 && !inMap(event)) event.preventDefault();
  };
  window.addEventListener("keydown", keydown, options);
  window.addEventListener("wheel", wheel, options);
  window.addEventListener("touchmove", touchmove, options);
  const gestures = ["gesturestart", "gesturechange", "gestureend"];
  gestures.forEach((type) => window.addEventListener(type, gesture, options));
  return () => {
    window.removeEventListener("keydown", keydown, options);
    window.removeEventListener("wheel", wheel, options);
    window.removeEventListener("touchmove", touchmove, options);
    gestures.forEach((type) => window.removeEventListener(type, gesture, options));
  };
}
