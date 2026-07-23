import { MobileActionPortal } from './MobileActionPortal'
import { useMobileTabPanelActive } from '../../contexts/MobileTabPanelContext'
import { useMobileActionBar } from '../../hooks/useMobileActionBar'

/**
 * Fixed primary actions above bottom nav on mobile. Portals outside scroll.
 */
export function MobileActionBar({ open, children, className = '' }) {
  const isPanelActive = useMobileTabPanelActive()
  const isOpen = open && isPanelActive

  useMobileActionBar(isOpen)

  return (
    <MobileActionPortal open={isOpen}>
      <div className={`mobile-action-bar ${className}`.trim()}>{children}</div>
    </MobileActionPortal>
  )
}
