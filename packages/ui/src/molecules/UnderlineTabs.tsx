export interface TabItem {
  id: string;
  label: string;
  /** Optional count shown as a pill, GitHub-style. */
  count?: number;
}

/**
 * GitHub-style underline tabs for in-page sub-navigation
 * (e.g. Detail / Riwayat / Sesi on an employee detail page).
 */
export function UnderlineTabs({
  items,
  active,
  onSelect,
}: {
  items: TabItem[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="utabs" role="tablist" aria-label="Sub-navigasi">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active === item.id}
          className="utabs__tab"
          data-active={active === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
          {typeof item.count === "number" && (
            <span className="utabs__count">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
