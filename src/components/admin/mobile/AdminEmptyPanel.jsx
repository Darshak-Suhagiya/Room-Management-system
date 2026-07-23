import { MobileEmptyState } from '../../mobile/MobileEmptyState'

export function AdminEmptyPanel({ title, hint, children, className = '' }) {
  return (
    <MobileEmptyState title={title} hint={hint} className={`admin-mobile-empty ${className}`.trim()}>
      {children}
    </MobileEmptyState>
  )
}
