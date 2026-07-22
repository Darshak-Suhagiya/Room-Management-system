import { MobileActionPortal } from './MobileActionPortal'
import { useMobileActionBar } from '../../hooks/useMobileActionBar'

/**
 * Fixed primary actions above bottom nav on mobile. Portals outside scroll.
 */
export function MobileActionBar({ open, children, className = '' }) {
  useMobileActionBar(open)

  return (
    <MobileActionPortal open={open}>
      <div className={`mobile-action-bar ${className}`.trim()}>{children}</div>
    </MobileActionPortal>
  )
}
