import type { ReactNode } from "react";
import { Table } from "@heroui/react";

/** Keeps table semantics while making the row a keyboard and pointer target. */
export function InteractiveTableRow({ id, label, onActivate, children }: {
  id?: string;
  label: string;
  onActivate: () => void;
  children: ReactNode;
}) {
  return <Table.Row id={id} aria-label={label} data-interactive-row="true" onAction={onActivate}>
    {children}
  </Table.Row>;
}
