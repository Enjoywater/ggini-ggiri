'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/**
 * Animates a number from its previous value to the target.
 * Uses requestAnimationFrame with easeOutCubic easing.
 * Returns target immediately if prefers-reduced-motion is set.
 */
export function useAnimatedNumber(target: number, duration: number = 150): number {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(target);
  const startRef = useRef(target);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (reducedMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(target);
      return;
    }

    const from = startRef.current;
    if (from === target) return;

    startTimeRef.current = null;
    cancelAnimationFrame(rafRef.current);

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * eased);
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, reducedMotion]);

  // Keep startRef in sync when reduced motion
  useEffect(() => {
    if (reducedMotion) {
      startRef.current = target;
    }
  }, [target, reducedMotion]);

  return display;
}
