import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

/**
 * Test helper: wraps the route tree in an in-memory router so a test can start
 * at a chosen path and drive back/forward without touching the real history.
 */
export function memoryRouter(initialEntries: string[]) {
  return (children: ReactNode) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}
