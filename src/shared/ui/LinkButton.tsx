'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { type ButtonVariant, type ButtonSize, getButtonClassName } from './button-styles';

interface LinkButtonProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  children,
  onClick,
  ...props
}: LinkButtonProps) {
  const combinedClassName = getButtonClassName(variant, size, fullWidth, disabled, className);

  if (disabled) {
    return (
      <a
        role="link"
        aria-disabled="true"
        tabIndex={-1}
        className={combinedClassName}
        onClick={(e) => e.preventDefault()}
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={combinedClassName} onClick={onClick} {...props}>
      {children}
    </Link>
  );
}
