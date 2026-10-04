import { Button, Dropdown, Label } from "@heroui/react";
import { CaretDown } from "@phosphor-icons/react";

export function FilterSelect({ label, value, onChange, options, disabled = false }: {
  label: string; value: string; onChange: (value: string) => void;
  options: { id: string; name: string; disabled?: boolean }[]; disabled?: boolean;
}) {
  return <div className="form-field"><Label>{label}</Label><Dropdown>
    <Button size="sm" variant="secondary" aria-label={label} isDisabled={disabled}>
      {options.find((option) => option.id === value)?.name ?? "Pilihan tersimpan"}<CaretDown aria-hidden="true" size={16} />
    </Button>
    <Dropdown.Popover><Dropdown.Menu aria-label={label} selectionMode="single" selectedKeys={[value]}
      disabledKeys={options.filter((option) => option.disabled).map((option) => option.id)} onAction={(key) => onChange(String(key))}>
      {options.map((option) => <Dropdown.Item key={option.id} id={option.id} textValue={option.name}><Label>{option.name}</Label><Dropdown.ItemIndicator /></Dropdown.Item>)}
    </Dropdown.Menu></Dropdown.Popover>
  </Dropdown></div>;
}
