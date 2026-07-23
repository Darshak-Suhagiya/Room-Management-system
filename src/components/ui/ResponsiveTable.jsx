/**
 * ResponsiveTable — desktop table, mobile stacked cards.
 *
 * @param {object} props
 * @param {string} props.className - extra class on wrapper
 * @param {string} props.tableClassName - class on <table>
 * @param {React.ReactNode} props.children - <thead>/<tbody> for desktop
 * @param {Array<{id: string, cells: Array<{label: string, value: React.ReactNode}>}>} props.mobileRows
 */
export function ResponsiveTable({
  className = '',
  tableClassName = '',
  children,
  mobileRows = [],
}) {
  return (
    <div className={className}>
      <div className="hidden md:block overflow-x-auto">
        <table className={tableClassName}>{children}</table>
      </div>
      <div className="md:hidden flex flex-col gap-3">
        {mobileRows.map((row) => (
          <article
            key={row.id}
            className="rounded-default border border-border bg-surface p-4 shadow-sm"
          >
            <dl className="grid gap-2">
              {row.cells.map((cell, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-0.5 ${cell.fullWidth ? 'col-span-full' : ''}`}
                >
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                    {cell.label}
                  </dt>
                  <dd className="text-sm text-text">{cell.value}</dd>
                </div>
              ))}
            </dl>
            {row.actions && (
              <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                {row.actions}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
