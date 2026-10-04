import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";

// eslint-disable-next-line react-refresh/only-export-components
function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current-route">{location.pathname}{location.search}</output>;
}

export function memoryRouter(initialEntries: string[]) {
  return (children: ReactNode) => <MemoryRouter initialEntries={initialEntries}><LocationProbe />{children}</MemoryRouter>;
}
