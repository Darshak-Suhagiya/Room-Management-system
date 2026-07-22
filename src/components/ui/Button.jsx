const variants = {
  primary:
    'bg-primary text-primary-contrast hover:bg-primary-hover border border-transparent',
  secondary:
    'bg-surface text-text border border-border hover:bg-surface-hover',
  ghost: 'bg-transparent text-text hover:bg-surface-hover border border-transparent',
  danger:
    'bg-danger text-white hover:bg-danger-hover border border-transparent',
  outline:
    'bg-transparent text-primary border border-primary hover:bg-primary-soft',
}

const sizes = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-default font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
