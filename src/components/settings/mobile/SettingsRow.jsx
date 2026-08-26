import { ChevronRight } from 'lucide-react'

export function SettingsRow({
  icon: Icon,
  label,
  subtitle,
  onClick,
  disabled = false,
  chevron = true,
}) {
  return (
    <button
      type="button"
      className={`settings-mobile-row${disabled ? ' is-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon ? (
        <span className="settings-mobile-row-icon" aria-hidden>
          <Icon size={20} />
        </span>
      ) : null}
      <span className="settings-mobile-row-text">
        <span className="settings-mobile-row-label">{label}</span>
        {subtitle ? <span className="muted settings-mobile-row-sub">{subtitle}</span> : null}
      </span>
      {chevron ? <ChevronRight size={18} className="settings-mobile-row-chevron" aria-hidden /> : null}
    </button>
  )
}

export function SettingsGroup({ title, children }) {
  return (
    <section className="settings-mobile-group">
      {title ? <h3 className="settings-mobile-group-title">{title}</h3> : null}
      <div className="settings-mobile-group-card">{children}</div>
    </section>
  )
}
