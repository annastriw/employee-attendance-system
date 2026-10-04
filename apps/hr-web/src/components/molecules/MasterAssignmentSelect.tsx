import { useId } from 'react';
import { Button, Dropdown, Label } from '@heroui/react';
import { CaretDown } from '@phosphor-icons/react';
import type { MasterRecord } from '../../lib/master-data';

/** Assignment input for T12: inactive records remain context, never new choices. */
export function MasterAssignmentSelect({ label, records, current, onChange, disabled = false }: {
  label: 'Departemen' | 'Jabatan';
  records: MasterRecord[];
  current?: MasterRecord;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const descriptionId = useId();
  const active = records.filter(record => record.status === 'ACTIVE').sort((a, b) => a.name.localeCompare(b.name, 'id'));
  return (
    <div className="form-field">
      <Dropdown>
        <Button variant="secondary" aria-label={`Pilih ${label.toLowerCase()}`}
          aria-describedby={current?.status === 'INACTIVE' ? descriptionId : undefined}
          isDisabled={disabled || active.length === 0}>
          {current?.name ?? `Pilih ${label.toLowerCase()}`}<CaretDown size={16} aria-hidden="true" />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu aria-label={`${label} aktif`} selectionMode="single"
            selectedKeys={current?.status === 'ACTIVE' ? [current.id] : []}
            onAction={key => { if (active.some(record => record.id === String(key))) onChange(String(key)); }}>
            {active.map(record => (
              <Dropdown.Item key={record.id} id={record.id} textValue={record.name}>
                <Label>{record.name}</Label><Dropdown.ItemIndicator />
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      {current?.status === 'INACTIVE' && <p id={descriptionId} className="dialog-text">
        {current.name} sudah nonaktif. Nilai lama tetap tersimpan; penugasan baru hanya memakai {label.toLowerCase()} aktif.
      </p>}
      {!active.length && <p className="dialog-text">Belum ada {label.toLowerCase()} aktif.</p>}
    </div>
  );
}
