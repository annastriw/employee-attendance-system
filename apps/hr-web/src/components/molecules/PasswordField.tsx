import { useState } from "react";
import { Button, Description, InputGroup, Label, TextField } from "@heroui/react";
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
      <InputGroup>
        <InputGroup.Input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
        />
        <InputGroup.Suffix>
          <Button
            type="button"
            variant="ghost"
            className="password-toggle"
            aria-label={`${visible ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`}
            aria-pressed={visible}
            onPress={() => setVisible(!visible)}
            isDisabled={disabled}
          >
            {visible ? "Sembunyikan" : "Lihat"}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
      {description && <Description>{description}</Description>}
    </TextField>
  );
}
