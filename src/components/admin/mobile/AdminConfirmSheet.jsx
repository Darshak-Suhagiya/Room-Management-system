import { Modal } from '../../ui/Modal'

export function AdminConfirmSheet({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={message}
      busy={busy}
    >
      <div className="admin-mobile-confirm-actions">
        <button
          type="button"
          className="btn btn-secondary btn-block"
          disabled={busy}
          onClick={onClose}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn btn-block ${destructive ? 'btn-danger' : 'btn-primary'}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
