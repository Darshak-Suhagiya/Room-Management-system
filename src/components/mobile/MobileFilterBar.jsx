/**
 * Sticky filter row for mobile pages (analytics, admin filters, etc.).
 */
export function MobileFilterBar({ children, className = '' }) {
  return (
    <div className={`mobile-filter-bar ${className}`.trim()}>{children}</div>
  )
}
