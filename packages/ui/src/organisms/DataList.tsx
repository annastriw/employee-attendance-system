import type { ReactNode } from "react";
import { Button } from "@heroui/react";

export function DataList({ children, label }: { children: ReactNode; label: string }) {
  return <ul className="data-list" aria-label={label}>{children}</ul>;
}
export function DataListRow({ children, label, onPress }: { children: ReactNode; label: string; onPress: () => void }) {
  return <li><Button variant="ghost" className="data-list-row" aria-label={label} onPress={onPress}>{children}</Button></li>;
}
