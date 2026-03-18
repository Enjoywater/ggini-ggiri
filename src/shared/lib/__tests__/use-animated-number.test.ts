import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { useAnimatedNumber } from '../use-animated-number';

// Mock useReducedMotion
let reducedMotionValue = false;
vi.mock('../use-reduced-motion', () => ({
  useReducedMotion: () => reducedMotionValue,
}));

describe('useAnimatedNumber', () => {
  let rafCallbacks: Array<(time: number) => void> = [];
  let rafId = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    rafCallbacks = [];
    rafId = 0;
    reducedMotionValue = false;

    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      // no-op for test simplicity
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const advanceRAF = (time: number) => {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach((cb) => cb(time));
  };

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useAnimatedNumber(1000));
    expect(result.current).toBe(1000);
  });

  it('animates to new target value', () => {
    const duration = 150;
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, duration),
      { initialProps: { target: 0 } },
    );

    expect(result.current).toBe(0);

    // Change target to 1000
    rerender({ target: 1000 });

    // First rAF kick-starts the animation at timestamp 0
    act(() => advanceRAF(0));
    // At t=0, progress=0, eased=0 => value = 0
    expect(result.current).toBe(0);

    // Halfway through duration
    act(() => advanceRAF(75));
    // progress = 0.5, easeOutCubic = 1 - (0.5)^3 = 0.875 => ~875
    expect(result.current).toBe(875);

    // Complete animation
    act(() => advanceRAF(150));
    // progress = 1, eased = 1 => value = 1000
    expect(result.current).toBe(1000);
  });

  it('returns target immediately when reduced motion is preferred', () => {
    reducedMotionValue = true;

    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target),
      { initialProps: { target: 0 } },
    );

    expect(result.current).toBe(0);

    rerender({ target: 5000 });
    // With reduced motion, the value should jump immediately
    expect(result.current).toBe(5000);
  });

  it('handles multiple rapid target changes', () => {
    const duration = 150;
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, duration),
      { initialProps: { target: 0 } },
    );

    // Change to 1000
    rerender({ target: 1000 });
    act(() => advanceRAF(0));
    act(() => advanceRAF(75));
    // Midway to 1000, value ~875
    const midValue = result.current;
    expect(midValue).toBeGreaterThan(0);
    expect(midValue).toBeLessThan(1000);

    // Rapidly change to 2000 before first animation completes
    rerender({ target: 2000 });
    // New animation starts from current startRef (still 0 since animation hadn't completed)
    act(() => advanceRAF(0));

    // Complete the second animation
    act(() => advanceRAF(150));
    expect(result.current).toBe(2000);
  });

  it('returns integer values (rounded)', () => {
    const duration = 150;
    const { result, rerender } = renderHook(
      ({ target }) => useAnimatedNumber(target, duration),
      { initialProps: { target: 0 } },
    );

    rerender({ target: 333 });

    // Advance to a point that would produce a non-integer without rounding
    act(() => advanceRAF(0));
    act(() => advanceRAF(50));

    // Math.round should ensure integer
    expect(Number.isInteger(result.current)).toBe(true);
  });
});
