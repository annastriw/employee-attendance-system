import { useEffect, useRef } from "react";
import { Label, SearchField } from "@heroui/react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

/** Controlled text edits are immediate; API/query changes use onSearch after 300ms. */
export function SearchInput({ label = "Cari", value, onChange, onSearch, placeholder = "Cari…", disabled = false }: {
  label?: string; value: string; onChange: (value: string) => void;
  onSearch: (value: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const debounced = useDebouncedValue(value);
  const callback = useRef(onSearch);
  const previous = useRef(value);
  useEffect(() => { callback.current = onSearch; }, [onSearch]);
  useEffect(() => {
    if (previous.current !== debounced) {
      previous.current = debounced;
      callback.current(debounced);
    }
  }, [debounced]);
  return (
    <SearchField value={value} onChange={onChange} isDisabled={disabled} className="form-field shared-search">
      <Label>{label}</Label>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder={placeholder} />
        <SearchField.ClearButton aria-label="Hapus pencarian" />
      </SearchField.Group>
    </SearchField>
  );
}
