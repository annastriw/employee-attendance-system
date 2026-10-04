import type { ReactNode } from "react";
import { UsersThree } from "@phosphor-icons/react";

interface PortalBrandProps {
  name: string;
  /** Glyph shown inside the emerald mark. Defaults to the HR glyph. */
  icon?: ReactNode;
}

export function PortalBrand({ name, icon }: PortalBrandProps) {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        {icon ?? <UsersThree size={16} weight="bold" />}
      </span>
      {name}
    </div>
  );
}
