import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Zustand persist 미들웨어와 Next.js SSR의 hydration mismatch 방지 훅.
 * 서버에서는 false, 클라이언트에서는 true를 반환한다.
 */
export function useHydration(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
