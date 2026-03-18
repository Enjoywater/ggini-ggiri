import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useReducedMotion } from '../use-reduced-motion';

const mockMatchMedia = (matches: boolean) => {
  const listeners: Array<() => void> = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, cb: () => void) => listeners.push(cb),
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  return { fireChange: () => listeners.forEach((cb) => cb()) };
};

describe('useReducedMotion', () => {
  beforeEach(() => {
    // Reset to default (no reduced motion) – matches setup.ts
    mockMatchMedia(false);
  });

  it('returns false by default (no reduced motion)', () => {
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when matchMedia returns matches: true', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('re-renders when media query changes', () => {
    // Start with reduced motion OFF
    const { fireChange } = mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // Simulate media query changing to reduced motion ON
    // The hook uses useSyncExternalStore, which calls getSnapshot after the
    // change event. We need matchMedia to now return matches: true.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({
        matches: true,
        media: '',
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    act(() => {
      fireChange();
    });

    expect(result.current).toBe(true);
  });
});
