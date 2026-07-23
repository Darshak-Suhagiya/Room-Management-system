export function PageHeader({ icon: Icon, title, description, actions, className = '' }) {
  return (
    <header
      className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <span
            className="inline-flex shrink-0 items-center justify-center w-10 h-10 rounded-default bg-primary-soft text-primary"
            aria-hidden
          >
            <Icon size={22} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-text">{title}</h2>
          {description && (
            <p className="mt-1 text-muted text-[0.95rem]">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </header>
  )
}
