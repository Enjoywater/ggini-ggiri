'use client';

import { useEffect } from 'react';
import { useThemeStore } from '../model/store';

function applyTheme(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update <meta name="theme-color">
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', isDark ? '#111113' : '#FAFBFC');
  }
}

export function useThemeEffect() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    if (mode === 'light') {
      applyTheme(false);
      return;
    }

    if (mode === 'dark') {
      applyTheme(true);
      return;
    }

    // system mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(mq.matches);

    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);
}
