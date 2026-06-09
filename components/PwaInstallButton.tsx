'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function IconInstall(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={props.className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

/**
 * Shows an "Install app" button when the browser has fired beforeinstallprompt
 * and the app is not already running in standalone / installed mode.
 *
 * This is the reliable way to let users install the PWA on desktop Chrome/Edge,
 * where the passive address-bar install notice is often suppressed.
 */
export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect if already installed / running as PWA
    const checkStandalone = () => {
      const standalone =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        // @ts-expect-error - iOS Safari
        window.navigator.standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();

    const media = window.matchMedia?.('(display-mode: standalone)');
    const onChange = () => checkStandalone();
    media?.addEventListener?.('change', onChange);

    const handler = (e: Event) => {
      // Prevent the default mini-infobar from appearing (we'll use our own UI)
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      window.removeEventListener('appinstalled', onAppInstalled);
      media?.removeEventListener?.('change', onChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // Outcome can be 'accepted' or 'dismissed'. We clear either way.
      if (outcome === 'accepted') {
        setIsStandalone(true);
      }
    } catch {
      // ignore
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || !deferredPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-50 sm:h-9 sm:w-9"
      aria-label="Install Muzical app"
      title="Install app"
    >
      <IconInstall className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
    </button>
  );
}
