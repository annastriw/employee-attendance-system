import { useState } from "react";
import { Button, Description, Input, Label, TextField } from "@heroui/react";
interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  description?: string;
  disabled?: boolean;
}
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  description,
  disabled,
}: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      className="form-field"
      value={value}
      onChange={onChange}
      isRequired
      isDisabled={disabled}
      validationBehavior="aria"
    >
      <Label>{label}</Label>
      <div className="password-input">
        <Input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
        />
        <Button
          type="button"
          variant="ghost"
          className="reveal-password"
          aria-label={`${visible ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onPress={() => setVisible(!visible)}
          isDisabled={disabled}
        >
          {visible ? "Sembunyikan" : "Lihat"}
        </Button>
      </div>
      {description && <Description>{description}</Description>}
    </TextField>
  );
}
