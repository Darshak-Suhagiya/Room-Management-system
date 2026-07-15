import { useEffect, useState } from 'react'
import { Bell, BellOff, Smartphone } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  isIosDevice,
  isStandaloneDisplay,
  pushPermissionState,
  removeCurrentPushToken,
  requestPermissionAndSaveToken,
} from '../services/pushTokenService'

export function PushPermissionCard() {
  const { user, profile, isApproved } = useAuth()
  const [permission, setPermission] = useState(() => pushPermissionState())
  const [tokenReady, setTokenReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const userId = profile?.id || user?.uid

  // If browser already granted permission, re-save FCM token (needed after SW/VAPID updates).
  useEffect(() => {
    if (!isApproved || !userId) return undefined
    const currentPerm = pushPermissionState()
    if (currentPerm !== 'granted') return undefined
    if (isIosDevice() && !isStandaloneDisplay()) return undefined

    let cancelled = false
    ;(async () => {
      try {
        await requestPermissionAndSaveToken(userId)
        if (!cancelled) {
          setPermission('granted')
          setTokenReady(true)
          setError('')
        }
      } catch (err) {
        console.error('refresh push token', err)
        if (!cancelled) {
          setTokenReady(false)
          setPermission(pushPermissionState())
          setError(
            err.message ||
              'Could not register this device for push. Tap Enable again.',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isApproved, userId])

  useEffect(() => {
    setPermission(pushPermissionState())
  }, [])

  if (!isApproved || !user) return null

  const iosNeedsHomeScreen = isIosDevice() && !isStandaloneDisplay()
  const enabled = permission === 'granted' && tokenReady

  const onEnable = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await requestPermissionAndSaveToken(userId)
      setPermission('granted')
      setTokenReady(true)
      setMessage('Notifications enabled on this device.')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not enable notifications.')
      setPermission(pushPermissionState())
      setTokenReady(false)
    } finally {
      setBusy(false)
    }
  }

  const onDisable = async () => {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await removeCurrentPushToken(userId)
      setTokenReady(false)
      setMessage(
        'Push token removed from this device. You can also revoke permission in browser settings.',
      )
      setPermission(pushPermissionState())
    } catch (err) {
      setError(err.message || 'Could not disable.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="push-permission-card">
      <div className="push-permission-card-icon" aria-hidden>
        {enabled ? <Bell size={20} /> : <BellOff size={20} />}
      </div>
      <div className="push-permission-card-body">
        <h3 className="push-permission-card-title">Push notifications</h3>
        {iosNeedsHomeScreen ? (
          <p className="push-permission-card-text">
            On iPhone / iPad: tap Share → <strong>Add to Home Screen</strong>, open
            the app from that icon, then enable notifications here.
          </p>
        ) : (
          <p className="push-permission-card-text">
            Get reminders for menus and votes even when the app is closed.
            {permission === 'granted' && !tokenReady
              ? ' Permission is on, but this device is not registered yet.'
              : null}
          </p>
        )}
        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
      <div className="push-permission-card-actions">
        {enabled ? (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onDisable}
            disabled={busy || iosNeedsHomeScreen}
          >
            Disable on this device
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onEnable}
            disabled={busy || iosNeedsHomeScreen || permission === 'unsupported'}
          >
            <Smartphone size={16} aria-hidden />
            {busy
              ? 'Enabling…'
              : permission === 'granted'
                ? 'Register this device'
                : 'Enable notifications'}
          </button>
        )}
      </div>
    </div>
  )
}
