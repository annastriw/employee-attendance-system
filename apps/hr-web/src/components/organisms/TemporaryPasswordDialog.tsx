import { useState } from 'react';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Copy } from '@phosphor-icons/react';
import { Notice } from '../molecules/Notice';
import type { TemporaryCredential } from '../../lib/employees';
export function TemporaryPasswordDialog({ credential, onClose }: { credential: TemporaryCredential; onClose: () => void }) {
  const [message, setMessage] = useState(''); const [failed, setFailed] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(credential.temporaryPassword); setMessage('Password disalin.'); setFailed(false); } catch { setMessage('Tidak dapat menyalin. Salin password secara manual.'); setFailed(true); } }
  return <Modal.Backdrop isOpen onOpenChange={open => { if (!open) onClose(); }}><Modal.Container size="sm"><Modal.Dialog className="dialog"><Modal.Header><Modal.Heading className="dialog-title">Password sementara</Modal.Heading></Modal.Header><Modal.Body className="dialog-body"><p className="dialog-text">Akun <strong>{credential.email}</strong> sudah dibuat. Sampaikan password ini secara manual; password tidak dapat ditampilkan ulang setelah ditutup.</p><TextField isReadOnly value={credential.temporaryPassword}><Label>Password sementara</Label><Input className="temporary-password" autoComplete="off" /></TextField>{message && <Notice message={message} success={!failed} />}</Modal.Body><Modal.Footer className="dialog-footer"><Button variant="secondary" onPress={() => void copy()}><Copy size={16} aria-hidden="true" />Salin</Button><Button variant="primary" onPress={onClose}>Selesai</Button></Modal.Footer></Modal.Dialog></Modal.Container></Modal.Backdrop>;
}
