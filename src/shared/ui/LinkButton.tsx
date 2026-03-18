'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';
import { type ButtonVariant, type ButtonSize, getButtonClassName } from './button-styles';
import { navigateWithTransition } from '@/shared/lib/view-transition';

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
  const router = useRouter();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        onClick?.(e);
        return;
      }

      e.preventDefault();
      onClick?.(e);

      const href = typeof props.href === 'string' ? props.href : props.href.toString();
      navigateWithTransition(href, () => {
        router.push(href);
      });
    },
    [onClick, props.href, router],
  );

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
    <Link className={combinedClassName} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
