import { Modal } from '../ui/Modal'
import { useNotificationInbox } from '../../contexts/NotificationInboxContext'
import { NotificationInboxList } from './NotificationInboxList'

export function NotificationInboxSheet() {
  const {
    inboxOpen,
    closeInbox,
    notifications,
    expandedId,
    busy,
    inboxError,
    markRead,
    clearAll,
  } = useNotificationInbox()

  return (
    <Modal
      open={inboxOpen}
      onClose={closeInbox}
      title="Notifications"
      wide
      busy={busy}
      className="notif-inbox-sheet"
    >
      <NotificationInboxList
        notifications={notifications}
        expandedId={expandedId}
        busy={busy}
        error={inboxError}
        onSelect={markRead}
        onClearAll={clearAll}
        showTitle={false}
      />
    </Modal>
  )
}
