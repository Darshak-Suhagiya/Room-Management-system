import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const PORTAL_ID = 'mobile-action-portal'

/** Mount fixed mobile action bars outside `.app-main` so they are not clipped by scroll. */
export function MobileActionPortal({ open, children }) {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    setTarget(document.getElementById(PORTAL_ID))
  }, [])

  if (!open || !target) return null
  return createPortal(children, target)
}
