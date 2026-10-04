import { useState, type SubmitEvent } from 'react';
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
} from '@heroui/react';
import { Notice, CalendarField } from "@attendance/ui";
import type { HolidayRecord } from '../../lib/holidays';

type Errors = { holidayDate?: string; description?: string };

function validate(holidayDate: string, description: string, todayWIB: string): Errors {
  const errors: Errors = {};
  if (!holidayDate) {
    errors.holidayDate = 'Tanggal libur wajib diisi.';
  } else if (holidayDate < todayWIB) {
    errors.holidayDate = 'Tanggal libur tidak boleh berupa tanggal lampau.';
  }

  const trimmed = description.trim();
  if (trimmed.length < 1) {
    errors.description = 'Keterangan tidak boleh kosong.';
  } else if (trimmed.length > 200) {
    errors.description = 'Keterangan maksimal 200 karakter.';
  }

  return errors;
}

export function HolidayFormDialog({
  open,
  record,
  readOnly = false,
  todayWIB,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  record?: HolidayRecord | null;
  readOnly?: boolean;
  todayWIB: string;
  busy: boolean;
  error: string;
  onSubmit: (input: { holidayDate: string; description: string }) => void;
  onClose: () => void;
}) {
  const [holidayDate, setHolidayDate] = useState(record?.holidayDate ?? todayWIB);
  const [description, setDescription] = useState(record?.description ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const conflict: Errors = error.includes('sudah terdaftar') || error.includes('lampau')
    ? { holidayDate: error }
    : {};
  const shown = { ...conflict, ...errors };
  const general = conflict.holidayDate ? '' : error;

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanDate = holidayDate.trim();
    const cleanDesc = description.trim().replace(/\s+/g, ' ');
    const found = validate(cleanDate, cleanDesc, todayWIB);
    setErrors(found);
    if (!found.holidayDate && !found.description) {
      onSubmit({ holidayDate: cleanDate, description: cleanDesc });
    }
  }

  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <Modal.Container size="sm">
        <Modal.Dialog className="dialog">
          <form onSubmit={submit} noValidate aria-busy={busy}>
            <Modal.Header>
              <Modal.Heading className="dialog-title">
                {record ? 'Ubah Hari Libur' : 'Tambah Hari Libur'}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="dialog-body">
              <CalendarField label="Tanggal Libur" value={holidayDate}
                onChange={value => { setHolidayDate(value); setErrors({ ...errors, holidayDate: undefined }); }}
                disabled={busy || readOnly} required min={todayWIB} error={shown.holidayDate}
                hint="Pilih tanggal hari ini atau mendatang (WIB)." />

              <TextField
                className="form-field"
                value={description}
                onChange={(value) => {
                  setDescription(value);
                  setErrors({ ...errors, description: undefined });
                }}
                isRequired
                isDisabled={busy || readOnly}
                isInvalid={Boolean(shown.description)}
                validationBehavior="aria"
                autoFocus={Boolean(record)}
              >
                <Label>Keterangan</Label>
                <Input placeholder="Contoh: Hari Raya Idul Fitri" />
                {shown.description ? (
                  <FieldError>{shown.description}</FieldError>
                ) : (
                  <Description>Nama hari libur nasional atau kebijakan khusus perusahaan.</Description>
                )}
              </TextField>

              {general && <Notice message={general} />}
            </Modal.Body>
            <Modal.Footer className="dialog-footer">
              <Button variant="tertiary" isDisabled={busy} onPress={onClose}>
                Batal
              </Button>
              {readOnly ? <Button variant="primary" onPress={onClose}>Tutup</Button> :
                <Button type="submit" variant="primary" isDisabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>}
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
