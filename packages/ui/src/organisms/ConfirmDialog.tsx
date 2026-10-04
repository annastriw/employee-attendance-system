import type { ReactNode } from "react";
import { Button, Modal } from "@heroui/react";
import { Notice } from "../molecules/Notice";

/** Shared confirmation pattern for consequential actions (deactivate, archive, delete). */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy,
  confirmDisabled = false,
  className = "",
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy: boolean;
  confirmDisabled?: boolean;
  className?: string;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal.Backdrop
      isOpen={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <Modal.Container size="sm">
        <Modal.Dialog className={["dialog", className].filter(Boolean).join(" ")}>
          <Modal.Header>
            <Modal.Heading className="dialog-title">{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="dialog-body">
            {children}
            {error && <Notice message={error} />}
          </Modal.Body>
          <Modal.Footer className="dialog-footer">
            <Button size="sm" variant="secondary" isDisabled={busy} onPress={onClose}>
              Batal
            </Button>
            <Button
              size="sm"
              variant="primary"
              isDisabled={busy || confirmDisabled}
              onPress={onConfirm}
            >
              {busy ? "Memproses…" : confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
