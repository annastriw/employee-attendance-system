import { useState } from "react";
import { Button, Description, InputGroup, Label, TextField } from "@heroui/react";
import { Eye, EyeSlash } from "@phosphor-icons/react";

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
  const action = visible ? "Sembunyikan" : "Tampilkan";
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
            isIconOnly
            className="password-toggle"
            aria-label={`${action} ${label.toLowerCase()}`}
            aria-pressed={visible}
            onPress={() => setVisible(!visible)}
            isDisabled={disabled}
          >
            {visible ? <EyeSlash size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
      {description && <Description>{description}</Description>}
    </TextField>
  );
}
