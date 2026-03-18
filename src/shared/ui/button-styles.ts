export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-text-primary hover:bg-primary-dark active:bg-primary-dark shadow-sm',
  secondary:
    'bg-surface-elevated text-text-primary border border-border hover:bg-surface active:bg-surface',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface active:bg-surface',
  danger:
    'bg-danger text-white hover:bg-danger-dark active:bg-danger-dark shadow-sm',
};

export const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg relative after:absolute after:inset-0 after:-m-[6px] after:content-[""]',
  md: 'px-4 py-2.5 text-base rounded-xl',
  lg: 'px-6 py-3 text-lg rounded-xl',
};

export const baseStyles =
  'inline-flex items-center justify-center font-medium transition-colors duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function getButtonClassName(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
): string {
  return [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    fullWidth ? 'w-full' : '',
    disabled ? 'opacity-50 pointer-events-none' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}
