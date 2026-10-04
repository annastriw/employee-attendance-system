import type { ReactNode } from "react";
import { Breadcrumb, type Crumb } from "../molecules/Breadcrumb";

/**
 * GitHub-style page header: optional breadcrumb above a title row,
 * with primary actions aligned right. Shared across HR detail/list pages.
 *
 * Pass `onNavigate` to make breadcrumb links navigate within the SPA router
 * instead of doing a full page load.
 */
export function PageHeader({
  breadcrumb,
  onNavigate,
  title,
  description,
  actions,
}: {
  breadcrumb?: Crumb[];
  onNavigate?: (href: string) => void;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb items={breadcrumb} onNavigate={onNavigate} />
      )}
      <div className="page-header__row">
        <div className="page-header__titles">
          <h1 className="page-header__title">{title}</h1>
          {description && <p className="page-header__desc">{description}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
