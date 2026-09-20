import { getDarshanArt } from '../../config/darshanArt'

const ALT = 'Shri Ghanshyam Maharaj'

export function BlessingHero({
  artKey = 'sheet',
  size = 'compact',
  kicker = 'Jay Swaminarayan',
  title,
  subtitle,
  actions = null,
  className = '',
  fetchPriority,
  showStamp = true,
  copyAlign = 'start',
}) {
  const art = getDarshanArt(artKey)
  const priority = fetchPriority === 'high' ? 'high' : undefined

  return (
    <header
      className={`blessing-hero blessing-hero-${size} blessing-hero-copy-${copyAlign} ${className}`.trim()}
      style={{
        '--darshan-pos': art.position,
        '--darshan-pos-mobile': art.mobilePosition,
      }}
    >
      <picture>
        <source media="(max-width: 899px)" srcSet={art.mobile} />
        <img
          className="blessing-hero-img"
          src={art.desktop}
          alt={ALT}
          width={1920}
          height={640}
          decoding="async"
          fetchPriority={priority}
        />
      </picture>
      <div className="blessing-hero-scrim" aria-hidden />
      <div className="blessing-hero-content">
        {showStamp ? (
          <img
            className="blessing-hero-stamp"
            src={art.stamp}
            alt=""
            width={88}
            height={88}
            decoding="async"
          />
        ) : null}
        <div className="blessing-hero-copy">
          {kicker ? <p className="blessing-hero-kicker">{kicker}</p> : null}
          {title ? <h2>{title}</h2> : null}
          {subtitle ? <p className="blessing-hero-sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="blessing-hero-actions">{actions}</div> : null}
      </div>
    </header>
  )
}
