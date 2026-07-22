export function IconButton({
  label,
  className = '',
  size = 'md',
  children,
  ...props
}) {
  const sizeClass =
    size === 'sm' ? 'min-h-9 min-w-9' : 'min-h-11 min-w-11'

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center shrink-0 p-0 rounded-default text-text hover:bg-surface-hover transition-colors ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
