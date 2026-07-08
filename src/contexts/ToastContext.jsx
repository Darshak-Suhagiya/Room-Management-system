import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message, variant = 'info', durationMs = 4000) => {
      const id = ++toastId
      setToasts((prev) => [...prev, { id, message, variant }])
      if (durationMs > 0) {
        setTimeout(() => dismiss(id), durationMs)
      }
      return id
    },
    [dismiss],
  )

  const toast = useMemo(
    () => ({
      show,
      success: (message, durationMs) => show(message, 'success', durationMs),
      error: (message, durationMs) => show(message, 'error', durationMs ?? 5000),
      info: (message, durationMs) => show(message, 'info', durationMs),
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.variant}`} role="alert">
            <span>{t.message}</span>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
