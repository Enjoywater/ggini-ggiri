'use client';

import { useRef } from 'react';

/**
 * Tracks which item IDs are newly added to a list.
 * Returns a Set of IDs that were added since last render.
 * Uses ref during render to track previous IDs — this is intentional
 * as we need synchronous access without triggering re-renders.
 */
export function useNewItemIds<T extends { id: string }>(items: T[]): Set<string> {
  const prevIdsRef = useRef<Set<string> | null>(null);

  const currentIds = new Set(items.map((i) => i.id));

  if (prevIdsRef.current === null) {
    prevIdsRef.current = currentIds;
    return new Set<string>();
  }

  const added = new Set<string>();
  for (const id of currentIds) {
    // eslint-disable-next-line react-hooks/refs
    if (!prevIdsRef.current.has(id)) {
      added.add(id);
    }
  }

  // eslint-disable-next-line react-hooks/refs
  prevIdsRef.current = currentIds;
  return added;
}
