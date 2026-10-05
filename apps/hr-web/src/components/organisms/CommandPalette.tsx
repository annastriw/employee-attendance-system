import { useEffect, useMemo, useRef, useState } from "react";
import { filterCommands, type Command } from "./command-palette";

export type { Command } from "./command-palette";

/**
 * Command palette: a modal overlay with a fuzzy-filtered, keyboard-navigable
 * list of navigation actions. Opened with Cmd/Ctrl-K from the
 * shell. Arrow keys move the active option, Enter runs it, Escape closes.
 *
 * The outer component gates on `open` and remounts the body on each open so the
 * query and selection start fresh without reset effects.
 */
export function CommandPalette({
  open,
  commands,
  onClose,
}: {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}) {
  if (!open) return null;
  return <CommandPaletteBody commands={commands} onClose={onClose} />;
}

function CommandPaletteBody({
  commands,
  onClose,
}: {
  commands: Command[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(
    () => filterCommands(commands, query),
    [commands, query],
  );

  // Clamp the active index during render so it is always valid without needing
  // a state-sync effect when results shrink.
  const activeIndex = results.length === 0 ? -1 : Math.min(active, results.length - 1);

  // Focus the search field on mount (focusing a DOM node is an external effect).
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  // Scroll the active option into view when it changes.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    node?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex]);

  const runActive = () => {
    const command = results[activeIndex];
    if (command) {
      onClose();
      command.run();
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive(results.length ? (activeIndex + 1) % results.length : 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive(
          results.length
            ? (activeIndex - 1 + results.length) % results.length
            : 0,
        );
        break;
      case "Enter":
        event.preventDefault();
        runActive();
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  };

  // Group headings are rendered inline while keeping a flat option index.
  let lastGroup = "";

  return (
    <div
      className="cmdk-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="cmdk-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Palet perintah"
        onKeyDown={onKeyDown}
      >
        <input
          ref={inputRef}
          className="cmdk-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-activedescendant={
            results[activeIndex]
              ? `cmdk-option-${results[activeIndex].id}`
              : undefined
          }
          placeholder="Cari perintah atau halaman…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <ul id="cmdk-list" ref={listRef} className="cmdk-list" role="listbox">
          {results.length === 0 ? (
            <li className="cmdk-empty" role="presentation">
              Tidak ada perintah yang cocok.
            </li>
          ) : (
            results.map((command, index) => {
              const header = command.group !== lastGroup ? command.group : null;
              lastGroup = command.group;
              const isActive = index === activeIndex;
              return (
                <li key={command.id} role="presentation">
                  {header && (
                    <p className="cmdk-group" role="presentation">
                      {header}
                    </p>
                  )}
                  <button
                    type="button"
                    id={`cmdk-option-${command.id}`}
                    role="option"
                    aria-selected={isActive}
                    data-active={isActive}
                    className="cmdk-option"
                    onMouseMove={() => setActive(index)}
                    onClick={() => {
                      onClose();
                      command.run();
                    }}
                  >
                    {command.icon && (
                      <span className="cmdk-option-icon" aria-hidden="true">
                        {command.icon}
                      </span>
                    )}
                    <span className="cmdk-option-label">{command.label}</span>
                    {command.hint && (
                      <span className="cmdk-option-hint">{command.hint}</span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
