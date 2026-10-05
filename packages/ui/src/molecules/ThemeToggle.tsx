import { Button, Dropdown, Label } from "@heroui/react";
import { Monitor, MoonStars, Sun } from "@phosphor-icons/react";
import { useTheme, type ThemePreference } from "../theme/useTheme";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Terang", Icon: Sun },
  { value: "dark", label: "Gelap", Icon: MoonStars },
  { value: "system", label: "Sistem", Icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setTheme } = useTheme();
  const selected = OPTIONS.find(option => option.value === preference)!;
  return <Dropdown>
    <Button variant="ghost" isIconOnly aria-label={`Pilih tema: ${selected.label}`} className="theme-menu-trigger">
      <selected.Icon size={18} aria-hidden="true" />
    </Button>
    <Dropdown.Popover placement="bottom end">
      <Dropdown.Menu aria-label="Tema tampilan" selectionMode="single" selectedKeys={[preference]}
        onAction={key => { const option = OPTIONS.find(item => item.value === key); if (option) setTheme(option.value); }}>
        {OPTIONS.map(({ value, label, Icon }) => <Dropdown.Item key={value} id={value} textValue={label}>
          <Icon size={16} aria-hidden="true" /><Label>{label}</Label><Dropdown.ItemIndicator />
        </Dropdown.Item>)}
      </Dropdown.Menu>
    </Dropdown.Popover>
  </Dropdown>;
}
