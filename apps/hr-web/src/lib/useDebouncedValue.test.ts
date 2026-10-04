import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useDebouncedValue } from "../../../../packages/ui/src/hooks/useDebouncedValue";
afterEach(() => vi.useRealTimers());
it("waits 300ms from the latest edit and debounces clearing", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), { initialProps: { value: "" } });
  rerender({ value: "a" });
  act(() => vi.advanceTimersByTime(200));
  expect(result.current).toBe("");
  rerender({ value: "ab" });
  act(() => vi.advanceTimersByTime(299)); expect(result.current).toBe("");
  act(() => vi.advanceTimersByTime(1)); expect(result.current).toBe("ab");
  rerender({ value: "" });
  act(() => vi.advanceTimersByTime(300)); expect(result.current).toBe("");
});
it("cancels pending work on unmount", () => {
  vi.useFakeTimers();
  const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value), { initialProps: { value: "a" } });
  rerender({ value: "b" }); unmount();
  expect(vi.getTimerCount()).toBe(0);
});
