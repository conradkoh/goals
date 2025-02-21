'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/utils/registerServiceWorker';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
