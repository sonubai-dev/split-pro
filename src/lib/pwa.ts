import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global state to allow sharing across AppHeader and other components
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let updateWaitingWorker: ServiceWorker | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * Register Service Worker and initialize PWA event listeners
 */
export function registerPwaServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // 1. Capture beforeinstallprompt for custom install triggers
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  // 2. Capture appinstalled
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
    console.log('[Vistaro PWA] Application successfully installed to device');
  });

  // 3. Register Service Worker on window load
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check if an updated worker is already waiting
        if (registration.waiting) {
          updateWaitingWorker = registration.waiting;
          notifyListeners();
        }

        // Listen for new worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New update is ready and waiting to take over
              updateWaitingWorker = newWorker;
              notifyListeners();
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[Vistaro PWA] Service worker registration failed:', err);
      });

    // Handle controller change (reloads page when new worker takes over)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

/**
 * React Hook for PWA installation and update management
 */
export function usePwa() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleChange = () => setTick((t) => t + 1);
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  }, []);

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  const canInstall = !!deferredPrompt && !isStandalone;
  const isUpdateAvailable = !!updateWaitingWorker;

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        deferredPrompt = null;
        notifyListeners();
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[Vistaro PWA] Install prompt failed:', err);
      return false;
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if (!updateWaitingWorker) return;
    updateWaitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  return {
    canInstall,
    isStandalone,
    isUpdateAvailable,
    promptInstall,
    applyUpdate,
  };
}
