'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface StickyBottomBarProps {
  children: ReactNode;
  show: boolean;
}

export function StickyBottomBar({ children, show }: StickyBottomBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!show) return;

    const handleScroll = () => {
      const atBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 2;
      setScrolled(prev => {
        const next = !atBottom;
        return prev === next ? prev : next;
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md bg-surface/80 px-4 pt-3 transition-shadow duration-200 ${
        scrolled ? 'shadow-[0_-2px_8px_rgba(0,0,0,0.08)]' : ''
      }`}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}
