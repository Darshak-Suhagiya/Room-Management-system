export function StickyActionBar({ children, className = '' }) {
  return (
    <div
      className={`sticky bottom-0 z-40 -mx-4 mt-4 border-t border-border bg-surface/95 backdrop-blur-sm px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:backdrop-blur-none md:p-0 ${className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">{children}</div>
    </div>
  )
}
