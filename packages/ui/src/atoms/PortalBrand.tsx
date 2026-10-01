interface PortalBrandProps {
  name: string;
  caption: string;
}
export function PortalBrand({ name, caption }: PortalBrandProps) {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
      <span>{name}<span className="brand-caption">{caption}</span></span>
    </div>
  );
}
