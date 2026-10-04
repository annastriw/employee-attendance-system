import type { ReactNode } from "react";
import { PortalBrand } from "../atoms/PortalBrand";

export interface ShowcaseItem {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface AuthShowcase {
  title: string;
  items: ShowcaseItem[];
}

interface AuthShellProps {
  name: string;
  children: ReactNode;
  /** Glyph for the brand mark. */
  brandIcon?: ReactNode;
  /**
   * Optional product panel. When given, the shell renders a split layout on
   * wide screens (form left, panel right); the panel is hidden below 1024px.
   * Omit it for focused auth screens such as password change.
   */
  showcase?: AuthShowcase;
}

export function AuthShell({ name, children, brandIcon, showcase }: AuthShellProps) {
  const content = (
    <div className="auth-content">
      <PortalBrand name={name} icon={brandIcon} />
      {children}
    </div>
  );

  if (!showcase) return <main className="auth-main">{content}</main>;

  return (
    <main className="auth-main auth-split">
      <div className="auth-form-column">{content}</div>
      <aside className="auth-showcase" aria-label={`Tentang ${name}`}>
        <h2 className="showcase-title">{showcase.title}</h2>
        <ul className="showcase-list">
          {showcase.items.map((item) => (
            <li key={item.title} className="showcase-item">
              <span className="showcase-icon" aria-hidden="true">{item.icon}</span>
              <div>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
