import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { isIosDevice, isStandaloneDisplay } from '../services/pushTokenService'

const DISMISS_KEY = 'rm-pwa-install-dismissed'

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Android / Chrome / Samsung: show Install when beforeinstallprompt fires.
 * Hidden when already standalone, on iOS, or after dismiss.
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(() => wasDismissed() || isStandaloneDisplay() || isIosDevice())

  useEffect(() => {
    if (hidden) return undefined

    const onBip = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onBip)

    const onInstalled = () => {
      setDeferred(null)
      setHidden(true)
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [hidden])

  if (hidden || !deferred) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setHidden(true)
    setDeferred(null)
  }

  const install = async () => {
    setBusy(true)
    try {
      deferred.prompt()
      const choice = await deferred.userChoice
      if (choice?.outcome === 'accepted') {
        setHidden(true)
      }
      setDeferred(null)
    } catch (err) {
      console.warn('PWA install prompt failed:', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="push-permission-card pwa-install-card">
      <div className="push-permission-card-icon" aria-hidden>
        <Download size={20} />
      </div>
      <div className="push-permission-card-body">
        <h3 className="push-permission-card-title">Install app</h3>
        <p className="push-permission-card-text">
          Add Room Management to your home screen for a full-screen app (works better on Samsung / Android).
        </p>
      </div>
      <div className="push-permission-card-actions pwa-install-actions">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={install}
          disabled={busy}
        >
          {busy ? 'Installing…' : 'Install'}
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost btn-icon-only"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
