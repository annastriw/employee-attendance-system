import { useEffect, useRef } from "react";
import { PortalBrand } from "@attendance/ui";
export function Brand() {
  return <PortalBrand name="HR Portal" caption="Administrasi karyawan" />;
}
export function PageTitle({ children }: { children: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <h1 ref={ref} tabIndex={-1}>{children}</h1>;
}
