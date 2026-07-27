import { Modal } from '../../ui/Modal'
import { PushLogDetailContent } from '../PushLogDetailContent'

export function PushLogDetailSheet({ open, onClose, log }) {
  if (!log) return null

  return (
    <Modal open={open} onClose={onClose} title={log.title} wide>
      <PushLogDetailContent log={log} />
    </Modal>
  )
}
