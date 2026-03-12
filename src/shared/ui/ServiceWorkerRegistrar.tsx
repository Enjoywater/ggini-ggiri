'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/shared/lib/register-sw';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
