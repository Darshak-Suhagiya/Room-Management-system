/**
 * Centered empty state for mobile layouts.
 */
export function MobileEmptyState({ title, hint, children, className = '' }) {
  return (
    <div className={`mobile-empty-state ${className}`.trim()}>
      {title && <p className="mobile-empty-state-title">{title}</p>}
      {hint && <p className="muted mobile-empty-state-hint">{hint}</p>}
      {children}
    </div>
  )
}
