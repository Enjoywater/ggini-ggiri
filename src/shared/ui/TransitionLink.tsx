'use client';

import { type ReactNode, type AnchorHTMLAttributes, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { navigateWithTransition } from '@/shared/lib/view-transition';

interface TransitionLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  children: ReactNode;
}

export function TransitionLink({ href, children, onClick, ...props }: TransitionLinkProps) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Let modifier-key clicks pass through for open-in-new-tab behavior
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        onClick?.(e);
        return;
      }

      e.preventDefault();
      onClick?.(e);

      navigateWithTransition(href, () => {
        router.push(href);
      });
    },
    [href, router, onClick],
  );

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
