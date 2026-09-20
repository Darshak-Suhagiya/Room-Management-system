import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import {
  clearAll as clearAllNotifications,
  markAllSeen,
  markRead as markNotificationRead,
  subscribeNotifications,
} from '../services/notificationInboxService'

const NotificationInboxContext = createContext(null)

export function NotificationInboxProvider({ children }) {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const userId = user?.uid ?? profile?.id ?? null
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [inboxError, setInboxError] = useState('')
  const [inboxOpen, setInboxOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setInboxError('')
      return undefined
    }
    return subscribeNotifications(userId, ({ notifications: items, unreadCount: count, error }) => {
      setNotifications(items)
      setUnreadCount(count)
      setInboxError(error ?? '')
    })
  }, [userId])

  const openInbox = useCallback(async () => {
    setInboxOpen(true)
    if (!userId) return
    try {
      await markAllSeen(userId)
    } catch (err) {
      console.error('markAllSeen', err)
    }
  }, [userId])

  const closeInbox = useCallback(() => {
    setInboxOpen(false)
    setExpandedId(null)
  }, [])

  const toggleInbox = useCallback(() => {
    if (inboxOpen) {
      closeInbox()
    } else {
      openInbox()
    }
  }, [inboxOpen, openInbox, closeInbox])

  const clearAll = useCallback(async () => {
    if (!userId) return
    setBusy(true)
    try {
      await clearAllNotifications(userId)
      setExpandedId(null)
    } catch (err) {
      console.error('clearAll notifications', err)
    } finally {
      setBusy(false)
    }
  }, [userId])

  const markRead = useCallback(
    async (notificationId) => {
      if (!userId || !notificationId) return
      setExpandedId(notificationId)
      try {
        await markNotificationRead(userId, notificationId)
      } catch (err) {
        console.error('markRead', err)
      }
    },
    [userId],
  )

  const selectNotification = useCallback(
    async (notificationId) => {
      const item = notifications.find((n) => n.id === notificationId)
      await markRead(notificationId)
      if (
        item &&
        (item.relatedType === 'finance' || item.source === 'finance')
      ) {
        closeInbox()
        const target = item.relatedId
          ? `/finance?collection=${encodeURIComponent(item.relatedId)}`
          : '/finance'
        navigate(target)
      }
    },
    [notifications, markRead, closeInbox, navigate],
  )

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      inboxError,
      inboxOpen,
      expandedId,
      busy,
      openInbox,
      closeInbox,
      toggleInbox,
      clearAll,
      markRead,
      selectNotification,
      setExpandedId,
    }),
    [
      notifications,
      unreadCount,
      inboxError,
      inboxOpen,
      expandedId,
      busy,
      openInbox,
      closeInbox,
      toggleInbox,
      clearAll,
      markRead,
      selectNotification,
    ],
  )

  return (
    <NotificationInboxContext.Provider value={value}>
      {children}
    </NotificationInboxContext.Provider>
  )
}

export function useNotificationInbox() {
  const ctx = useContext(NotificationInboxContext)
  if (!ctx) {
    throw new Error('useNotificationInbox must be used within NotificationInboxProvider')
  }
  return ctx
}
