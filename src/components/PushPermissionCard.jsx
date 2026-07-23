import { Bell, BellOff, Smartphone } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'

/**
 * Presentational push notification card.
 * @param {'prompt' | 'settings'} variant — prompt hides enable UI when checking; settings always shows full panel
 */
export function PushPermissionCard({ variant = 'prompt' }) {
  const {
    status,
    permission,
    tokenReady,
    busy,
    message,
    error,
    iosNeedsHomeScreen,
    enabled,
    onEnable,
    onDisable,
  } = usePushNotifications()

  if (variant === 'prompt' && (status === 'checking' || status === 'enabled')) {
    return null
  }

  const showChecking = variant === 'settings' && status === 'checking'
  const showEnabled = enabled || status === 'enabled'

  return (
    <div className={`push-permission-card${variant === 'settings' ? ' push-permission-card-settings' : ''}`}>
      <div className="push-permission-card-icon" aria-hidden>
        {showEnabled ? <Bell size={20} /> : <BellOff size={20} />}
      </div>
      <div className="push-permission-card-body">
        <h3 className="push-permission-card-title">Push notifications</h3>
        {showChecking ? (
          <p className="push-permission-card-text muted">Checking notification status…</p>
        ) : iosNeedsHomeScreen ? (
          <p className="push-permission-card-text">
            On iPhone / iPad: tap Share → <strong>Add to Home Screen</strong>, open
            the app from that icon, then enable notifications here.
          </p>
        ) : status === 'denied' ? (
          <p className="push-permission-card-text">
            Notifications are blocked in your browser settings. Allow notifications
            for this app, then tap Enable again.
          </p>
        ) : status === 'unsupported' ? (
          <p className="push-permission-card-text">
            Push notifications are not supported in this browser.
          </p>
        ) : showEnabled ? (
          <p className="push-permission-card-text">
            This device receives menu and vote reminders when the app is closed.
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
      {!showChecking && (
        <div className="push-permission-card-actions">
          {showEnabled ? (
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
      )}
    </div>
  )
}
