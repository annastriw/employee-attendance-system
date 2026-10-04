import { Fragment } from "react";
import { CaretRight } from "@phosphor-icons/react";

export interface Crumb {
  label: string;
  /** Omit href on the current (last) crumb. */
  href?: string;
}

/**
 * GitHub-style breadcrumb for hierarchical pages (HR portal).
 * The last crumb is the current page (aria-current), earlier crumbs are links.
 *
 * In a routed app, pass `onNavigate` so link crumbs navigate within the SPA
 * instead of triggering a full page load. When `onNavigate` is omitted the
 * crumbs fall back to plain anchors (static usage).
 */
export function Breadcrumb({
  items,
  onNavigate,
}: {
  items: Crumb[];
  onNavigate?: (href: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol className="breadcrumb__list">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="breadcrumb__item">
                {item.href && !last ? (
                  <a
                    className="breadcrumb__link"
                    href={item.href}
                    onClick={
                      onNavigate
                        ? (event) => {
                            // Let modified clicks (new tab, etc.) behave normally.
                            if (
                              event.defaultPrevented ||
                              event.button !== 0 ||
                              event.metaKey ||
                              event.ctrlKey ||
                              event.shiftKey ||
                              event.altKey
                            )
                              return;
                            event.preventDefault();
                            onNavigate(item.href!);
                          }
                        : undefined
                    }
                  >
                    {item.label}
                  </a>
                ) : (
                  <span
                    className="breadcrumb__current"
                    aria-current={last ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!last && (
                <li className="breadcrumb__sep" aria-hidden="true">
                  <CaretRight size={13} weight="bold" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
