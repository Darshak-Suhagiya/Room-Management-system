import { Bell } from 'lucide-react'
import { useNotificationInbox } from '../../contexts/NotificationInboxContext'

export function NotificationBell() {
  const { unreadCount, toggleInbox, inboxOpen } = useNotificationInbox()
  const showDot = unreadCount > 0

  return (
    <button
      type="button"
      className="topbar-notif-btn topbar-settings-btn touch-target inline-flex items-center justify-center"
      onClick={toggleInbox}
      aria-label={
        showDot
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
      aria-expanded={inboxOpen}
      title="Notifications"
    >
      <Bell size={22} aria-hidden />
      {showDot && (
        <span className="topbar-notif-dot" aria-hidden>
          {unreadCount > 9 ? '9+' : unreadCount > 1 ? unreadCount : ''}
        </span>
      )}
    </button>
  )
}
