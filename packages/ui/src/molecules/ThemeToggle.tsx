import { Monitor, MoonStars, Sun } from "@phosphor-icons/react";
import { useTheme, type ThemePreference } from "../theme/useTheme";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}[] = [
  { value: "light", label: "Terang", Icon: Sun },
  { value: "dark", label: "Gelap", Icon: MoonStars },
  { value: "system", label: "Sistem", Icon: Monitor },
];

/** Segmented light / dark / system control shared by both portals. */
export function ThemeToggle() {
  const { preference, setTheme } = useTheme();
  return (
    <div
      className="theme-toggle"
      role="radiogroup"
      aria-label="Tema tampilan"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          title={label}
          className="theme-toggle__option"
          data-active={preference === value}
          onClick={() => setTheme(value)}
        >
          <Icon size={16} weight={preference === value ? "fill" : "regular"} />
          <span className="theme-toggle__label">{label}</span>
        </button>
      ))}
    </div>
  );
}
