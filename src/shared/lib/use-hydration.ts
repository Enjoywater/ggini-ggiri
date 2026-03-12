import { useEffect, useState } from 'react';

/**
 * Zustand persist 미들웨어와 Next.js SSR의 hydration mismatch 방지 훅.
 * 클라이언트 hydration 완료 전까지 false를 반환한다.
 */
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
