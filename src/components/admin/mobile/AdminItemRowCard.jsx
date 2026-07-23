import { ChevronRight } from 'lucide-react'
import { triggerSelectionHaptic } from '../../../utils/haptics'

export function AdminItemRowCard({
  title,
  subtitle,
  badge,
  badgeTone,
  dirty = false,
  disabled = false,
  onClick,
  trailing,
  className = '',
}) {
  return (
    <button
      type="button"
      className={`admin-mobile-row-card rail-card${dirty ? ' is-dirty' : ''}${disabled ? ' is-disabled' : ''} ${className}`.trim()}
      disabled={disabled}
      onClick={() => {
        if (disabled) return
        triggerSelectionHaptic()
        onClick?.()
      }}
    >
      <span className="admin-mobile-row-main">
        <span className="admin-mobile-row-text">
          <span className="admin-mobile-row-title">{title}</span>
          {subtitle && (
            <span className="admin-mobile-row-subtitle muted">{subtitle}</span>
          )}
        </span>
        {badge && (
          <span className={`admin-mobile-row-badge ${badgeTone || ''}`.trim()}>
            {badge}
          </span>
        )}
        {dirty && <span className="admin-mobile-row-dot" aria-label="Unsaved changes" />}
      </span>
      <span className="admin-mobile-row-trail">
        {trailing}
        <ChevronRight size={18} className="admin-mobile-row-chevron" aria-hidden />
      </span>
    </button>
  )
}
