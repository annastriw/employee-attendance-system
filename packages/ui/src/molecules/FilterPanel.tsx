import type { ReactNode } from "react";
import { Button, Popover } from "@heroui/react";
import { Funnel, X } from "@phosphor-icons/react";

/** Category filters share one compact, keyboard-accessible panel and removable chips. */
export function FilterPanel({ children, active = [], onReset }: {
  children: ReactNode;
  active?: { key: string; label: string; onRemove: () => void }[];
  onReset: () => void;
}) {
  return <div className="filter-panel">
    <Popover>
      <Button size="sm" variant="secondary" aria-label="Buka filter">
        <Funnel size={16} aria-hidden="true" />Filter{active.length > 0 && <span className="filter-count">{active.length}</span>}
      </Button>
      <Popover.Content placement="bottom start" className="filter-panel-popover">
        <Popover.Dialog aria-label="Filter daftar">
          <div className="filter-panel-heading"><Popover.Heading>Filter</Popover.Heading>
            <Button size="sm" variant="ghost" isDisabled={!active.length} onPress={onReset}>Reset filter</Button></div>
          <div className="filter-panel-fields">{children}</div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
    {active.length > 0 && <div className="filter-chips" aria-label="Filter aktif">
      {active.map(item => <Button key={item.key} size="sm" variant="secondary" className="filter-chip"
        aria-label={`Hapus filter ${item.label}`} onPress={item.onRemove}>{item.label}<X size={12} aria-hidden="true" /></Button>)}
      <Button size="sm" variant="ghost" onPress={onReset}>Reset filter</Button>
    </div>}
  </div>;
}
