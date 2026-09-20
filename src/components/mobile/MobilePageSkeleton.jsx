import { BlessingHero } from '../darshan/BlessingHero'

export function MobilePageSkeleton({
  artKey = 'sheet',
  size = 'compact',
  title = 'Loading',
  copyAlign,
  showStamp = true,
}) {
  return (
    <div className="mobile-page-skeleton page" aria-busy="true" aria-label="Loading page">
      <BlessingHero
        artKey={artKey}
        size={size}
        title={title}
        subtitle="Please wait…"
        copyAlign={copyAlign}
        showStamp={showStamp}
      />
      <div className="mobile-page-skeleton-strip" />
      <div className="mobile-page-skeleton-card" />
      <div className="mobile-page-skeleton-card mobile-page-skeleton-card-short" />
    </div>
  )
}
