import { useState, type SubmitEvent } from "react";
import { Button, Description, FieldError, Input, Label, Modal, TextField } from "@heroui/react";
import { Notice } from "../molecules/Notice";
import type { MasterRecord } from "../../lib/master-data";

const CODE = /^[A-Z0-9][A-Z0-9_-]*$/;
type Errors = { name?: string; code?: string };

function validate(name: string, code: string): Errors {
  const errors: Errors = {};
  if (name.length < 2) errors.name = "Nama minimal 2 karakter.";
  else if (name.length > 120) errors.name = "Nama maksimal 120 karakter.";
  if (code.length < 2) errors.code = "Kode minimal 2 karakter.";
  else if (code.length > 40) errors.code = "Kode maksimal 40 karakter.";
  else if (!CODE.test(code)) errors.code = "Kode hanya boleh huruf, angka, tanda hubung atau garis bawah.";
  return errors;
}

export function MasterFormDialog({ open, record, label, busy, error, onSubmit, onClose }: {
  open: boolean;
  label: "departemen" | "jabatan";
  /** MasterRecord being edited; undefined when adding. */
  record?: MasterRecord;
  busy: boolean;
  /** Server error; a name/code conflict is shown next to its field. */
  error: string;
  onSubmit: (input: { name: string; code: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(record?.name ?? "");
  const [code, setCode] = useState(record?.code ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const conflict: Errors = error.startsWith("Kode") ? { code: error } : error.startsWith("Nama") ? { name: error } : {};
  const shown = { ...conflict, ...errors };
  const general = conflict.code || conflict.name ? "" : error;

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { name: name.trim().replace(/\s+/g, " "), code: code.trim().toUpperCase() };
    const found = validate(input.name, input.code);
    setErrors(found);
    if (!found.name && !found.code) onSubmit(input);
  }

  return (
      <Modal.Backdrop isOpen={open} onOpenChange={(next) => { if (!next && !busy) onClose(); }}>
        <Modal.Container size="sm">
          <Modal.Dialog className="dialog">
            <form onSubmit={submit} noValidate aria-busy={busy}>
              <Modal.Header>
                <Modal.Heading className="dialog-title">{`${record ? "Ubah" : "Tambah"} ${label}`}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="dialog-body">
                <TextField className="form-field" value={name} onChange={(value) => { setName(value); setErrors({ ...errors, name: undefined }); }}
                  isRequired isDisabled={busy} isInvalid={Boolean(shown.name)} validationBehavior="aria" autoFocus>
                  <Label>Nama</Label>
                  <Input placeholder="Keuangan" />
                  <FieldError>{shown.name}</FieldError>
                </TextField>
                <TextField className="form-field" value={code} onChange={(value) => { setCode(value); setErrors({ ...errors, code: undefined }); }}
                  isRequired isDisabled={busy} isInvalid={Boolean(shown.code)} validationBehavior="aria">
                  <Label>Kode</Label>
                  <Input className="tabular" placeholder="FIN" />
                  {shown.code ? <FieldError>{shown.code}</FieldError> : <Description>Huruf kapital, angka, tanda hubung. Unik.</Description>}
                </TextField>
                {general && <Notice message={general} />}
              </Modal.Body>
              <Modal.Footer className="dialog-footer">
                <Button variant="tertiary" isDisabled={busy} onPress={onClose}>Batal</Button>
                <Button type="submit" variant="primary" isDisabled={busy}>{busy ? "Menyimpan…" : "Simpan"}</Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
  );
}
