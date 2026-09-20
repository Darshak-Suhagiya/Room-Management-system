import { BlessingHero } from '../darshan/BlessingHero'

/**
 * Compact mobile page header: icon + title + optional right action on one row.
 * When artKey is set, renders the shared darshan banner instead.
 */
export function MobilePageHeader({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  artKey,
  size = 'compact',
  kicker,
  copyAlign,
  showStamp = true,
}) {
  if (artKey) {
    return (
      <BlessingHero
        artKey={artKey}
        size={size}
        title={title}
        subtitle={description}
        actions={action}
        kicker={kicker}
        className={className}
        copyAlign={copyAlign}
        showStamp={showStamp}
      />
    )
  }

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
