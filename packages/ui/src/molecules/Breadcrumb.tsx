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
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
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
                  <a className="breadcrumb__link" href={item.href}>
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
