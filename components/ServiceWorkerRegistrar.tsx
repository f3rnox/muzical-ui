'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker that powers offline caching and PWA installability.
 * Safe to include in any client component tree; does nothing on the server or
 * in environments without service worker support.
 *
 * The SW (public/sw.js) caches the app shell and Next.js static assets so the
 * player UI can boot and function without network after the first visit.
 * Local music playback never goes through the SW (it uses direct File handles).
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register on both dev (localhost) and prod so PWA install + offline can be tested easily.
    // In development the SW mainly helps validate the offline path; production deploys get full benefit.
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => {
        // Registration failures are non-fatal (e.g. private mode, unsupported browser).
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[muzical] Service worker registration failed:', err);
        }
      });
  }, []);

  return null;
}
