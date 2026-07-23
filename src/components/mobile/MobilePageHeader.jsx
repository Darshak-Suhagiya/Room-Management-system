/**
 * Compact mobile page header: icon + title + optional right action on one row.
 */
export function MobilePageHeader({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <header className={`mobile-page-header ${className}`.trim()}>
      <div className="mobile-page-header-main">
        {Icon && (
          <span className="mobile-page-header-icon" aria-hidden>
            <Icon size={20} />
          </span>
        )}
        <div className="mobile-page-header-text">
          <h2>{title}</h2>
          {description && <p className="muted">{description}</p>}
        </div>
      </div>
      {action && <div className="mobile-page-header-action">{action}</div>}
    </header>
  )
}
