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
        onSelect={markRead}
        onClearAll={clearAll}
        showTitle={false}
      />
    </Modal>
  )
}
