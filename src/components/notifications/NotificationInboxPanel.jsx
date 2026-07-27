import { useEffect, useRef } from 'react'
import { useNotificationInbox } from '../../contexts/NotificationInboxContext'
import { NotificationInboxList } from './NotificationInboxList'

export function NotificationInboxPanel() {
  const panelRef = useRef(null)
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

  useEffect(() => {
    if (!inboxOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeInbox()
    }
    const onPointerDown = (e) => {
      if (e.target.closest('.topbar-notif-anchor')) return
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        closeInbox()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [inboxOpen, closeInbox])

  if (!inboxOpen) return null

  return (
    <div ref={panelRef} className="notif-inbox-panel" role="dialog" aria-label="Notifications">
      <NotificationInboxList
        notifications={notifications}
        expandedId={expandedId}
        busy={busy}
        error={inboxError}
        onSelect={markRead}
        onClearAll={clearAll}
      />
    </div>
  )
}
