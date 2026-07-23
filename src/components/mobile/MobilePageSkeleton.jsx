export function MobilePageSkeleton() {
  return (
    <div className="mobile-page-skeleton page" aria-busy="true" aria-label="Loading page">
      <div className="mobile-page-skeleton-header" />
      <div className="mobile-page-skeleton-strip" />
      <div className="mobile-page-skeleton-card" />
      <div className="mobile-page-skeleton-card mobile-page-skeleton-card-short" />
    </div>
  )
}
