import { MobileActionPortal } from './MobileActionPortal'
import { useMobileTabPanelActive } from '../../contexts/MobileTabPanelContext'
import { useMobileActionBar } from '../../hooks/useMobileActionBar'

/**
 * Fixed primary actions above bottom nav on mobile. Portals outside scroll.
 * Pass `inline` inside a nested sheet so the bar stays above the modal.
 */
export function MobileActionBar({ open, children, className = '', inline = false }) {
  const isPanelActive = useMobileTabPanelActive()
  const isOpen = open && isPanelActive

  useMobileActionBar(isOpen && !inline)

  if (inline) {
    if (!isOpen) return null
    return (
      <div className={`mobile-action-bar mobile-action-bar-inline ${className}`.trim()}>
        {children}
      </div>
    )
  }

  return (
    <MobileActionPortal open={isOpen}>
      <div className={`mobile-action-bar ${className}`.trim()}>{children}</div>
    </MobileActionPortal>
  )
}
