import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { onMessage } from 'firebase/messaging'
import { useAuth } from './AuthContext'
import { getFirebaseMessaging } from '../lib/firebase'
import {
  isIosDevice,
  isStandaloneDisplay,
  pushPermissionState,
  removeCurrentPushToken,
  requestPermissionAndSaveToken,
} from '../services/pushTokenService'

const PUSH_ICON = '/icon-192.png'

/**
 * @typedef {'checking' | 'enabled' | 'prompt' | 'iosInstall' | 'unsupported' | 'denied'} PushStatus
 */

const PushNotificationContext = createContext(null)

function resolveStatusFromPermission(permission, tokenReady) {
  if (permission === 'unsupported') return 'unsupported'
  if (isIosDevice() && !isStandaloneDisplay()) return 'iosInstall'
  if (permission === 'denied') return 'denied'
  if (permission === 'granted' && tokenReady) return 'enabled'
  return 'prompt'
}

export function PushNotificationProvider({ children }) {
  const { user, profile, isApproved } = useAuth()
  const userId = profile?.id || user?.uid

  const [status, setStatus] = useState(/** @type {PushStatus} */ ('checking'))
  const [permission, setPermission] = useState(() => pushPermissionState())
  const [tokenReady, setTokenReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const finishChecking = useCallback((perm, ready, errMsg = '') => {
    setPermission(perm)
    setTokenReady(ready)
    setError(errMsg)
    setStatus(resolveStatusFromPermission(perm, ready))
  }, [])

  useEffect(() => {
    if (!isApproved || !userId) {
      setStatus('checking')
      return undefined
    }

    const perm = pushPermissionState()
    setPermission(perm)
    setStatus('checking')
    setError('')
    setMessage('')

    if (perm === 'unsupported') {
      finishChecking('unsupported', false)
      return undefined
    }

    if (isIosDevice() && !isStandaloneDisplay()) {
      finishChecking(perm, false)
      return undefined
    }

    if (perm === 'denied') {
      finishChecking('denied', false)
      return undefined
    }

    if (perm !== 'granted') {
      finishChecking(perm, false)
      return undefined
    }

    let cancelled = false
    ;(async () => {
      try {
        await requestPermissionAndSaveToken(userId)
        if (!cancelled) {
          finishChecking('granted', true)
        }
      } catch (err) {
        console.error('refresh push token', err)
        if (!cancelled) {
          finishChecking(
            pushPermissionState(),
            false,
            err.message ||
              'Could not register this device for push. Tap Enable again.',
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isApproved, userId, finishChecking])

  // Foreground FCM: browser does not auto-show notification payloads while focused.
  useEffect(() => {
    if (!isApproved || !userId) return undefined
    if (typeof Notification === 'undefined') return undefined
    if (Notification.permission !== 'granted') return undefined

    let unsubscribe = () => {}
    let cancelled = false

    ;(async () => {
      try {
        const messaging = await getFirebaseMessaging()
        if (!messaging || cancelled) return
        unsubscribe = onMessage(messaging, (payload) => {
          try {
            const title =
              payload.notification?.title ||
              payload.data?.title ||
              'Notification'
            const body =
              payload.notification?.body || payload.data?.body || ''
            // eslint-disable-next-line no-new
            new Notification(title, {
              body,
              icon: PUSH_ICON,
              data: payload.data || {},
            })
          } catch (err) {
            console.error('foreground notification', err)
          }
        })
      } catch (err) {
        console.error('subscribe foreground push', err)
      }
    })()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [isApproved, userId, permission, tokenReady])

  const onEnable = useCallback(async () => {
    if (!userId) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await requestPermissionAndSaveToken(userId)
      setPermission('granted')
      setTokenReady(true)
      setStatus('enabled')
      setMessage('Notifications enabled on this device.')
    } catch (err) {
      console.error(err)
      const perm = pushPermissionState()
      setError(err.message || 'Could not enable notifications.')
      setPermission(perm)
      setTokenReady(false)
      setStatus(resolveStatusFromPermission(perm, false))
    } finally {
      setBusy(false)
    }
  }, [userId])

  const onDisable = useCallback(async () => {
    if (!userId) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await removeCurrentPushToken(userId)
      setTokenReady(false)
      setMessage(
        'Push token removed from this device. You can also revoke permission in browser settings.',
      )
      const perm = pushPermissionState()
      setPermission(perm)
      setStatus(resolveStatusFromPermission(perm, false))
    } catch (err) {
      setError(err.message || 'Could not disable.')
    } finally {
      setBusy(false)
    }
  }, [userId])

  const value = useMemo(
    () => ({
      status,
      permission,
      tokenReady,
      busy,
      message,
      error,
      iosNeedsHomeScreen: isIosDevice() && !isStandaloneDisplay(),
      enabled: status === 'enabled',
      onEnable,
      onDisable,
      setMessage,
      setError,
    }),
    [status, permission, tokenReady, busy, message, error, onEnable, onDisable],
  )

  if (!isApproved || !user) {
    return children
  }

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  )
}

export function usePushNotifications() {
  const ctx = useContext(PushNotificationContext)
  if (!ctx) {
    return {
      status: 'checking',
      permission: pushPermissionState(),
      tokenReady: false,
      busy: false,
      message: '',
      error: '',
      iosNeedsHomeScreen: isIosDevice() && !isStandaloneDisplay(),
      enabled: false,
      onEnable: async () => {},
      onDisable: async () => {},
      setMessage: () => {},
      setError: () => {},
    }
  }
  return ctx
}
