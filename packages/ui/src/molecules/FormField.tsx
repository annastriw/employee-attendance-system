import type { ComponentProps, ReactNode } from "react";
import { Description, FieldError, Label, TextField } from "@heroui/react";

export function FormField({ label, hint, error, children, className = "", ...props }: Omit<ComponentProps<typeof TextField>, "children" | "className"> & {
  label: string; hint?: string; error?: string; children: ReactNode; className?: string;
}) {
  return (
    <TextField {...props} className={`form-field ${className}`} isInvalid={!!error || props.isInvalid} validationBehavior="aria">
      <Label>{label}</Label>
      {children}
      {hint && <Description>{hint}</Description>}
      {error && <FieldError>{error}</FieldError>}
    </TextField>
  );
}
