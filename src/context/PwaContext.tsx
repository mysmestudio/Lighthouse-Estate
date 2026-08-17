import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextType {
  isOnline: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isIos: boolean;
  updateAvailable: boolean;
  showInstallModal: boolean;
  showInstallBanner: boolean;
  setShowInstallModal: (open: boolean) => void;
  dismissInstallBanner: () => void;
  triggerInstall: () => Promise<void>;
  applyUpdate: () => void;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export const PwaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return isStandalone || isIosStandalone;
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const isIos = typeof navigator !== 'undefined' && 
    /iPad|iPhone|iPod/.test(navigator.userAgent) && 
    !(window as unknown as { MSStream?: unknown }).MSStream;

  // 1. Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Service Worker Registration & Update Flow
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          console.log('[PWA] Service Worker registered with scope:', registration.scope);

          // Check if a worker is already waiting
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
            setUpdateAvailable(true);
          }

          // Detect new updates found
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New version ready to activate.');
                  setWaitingWorker(installingWorker);
                  setUpdateAvailable(true);
                }
              });
            }
          });
        } catch (error) {
          console.warn('[PWA] Service Worker registration failed:', error);
        }
      };

      // Register after initial page load to preserve rendering performance
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  // 3. Listen for Controller Change (auto reload on skipWaiting)
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    }
  }, []);

  // 4. Capture beforeinstallprompt globally
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('[PWA] beforeinstallprompt captured.');
    };

    const handleAppInstalled = () => {
      console.log('[PWA] Application successfully installed.');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      setShowInstallModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 5. Timed Install Banner (~30 seconds after active session)
  useEffect(() => {
    if (isInstalled) return;

    const hasDismissed = sessionStorage.getItem('lh_pwa_banner_dismissed');
    if (hasDismissed) return;

    // Show after ~30 seconds of user activity on the portal
    const timer = setTimeout(() => {
      if (!isInstalled) {
        setShowInstallBanner(true);
      }
    }, 30000);

    return () => clearTimeout(timer);
  }, [isInstalled]);

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('lh_pwa_banner_dismissed', 'true');
  };

  const triggerInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log('[PWA] User install choice:', choice.outcome);
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setShowInstallBanner(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('[PWA] Error during prompt:', err);
      }
    } else {
      // For iOS or browsers without native prompt event, show instructions modal
      setShowInstallModal(true);
    }
  };

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isOnline,
        isInstalled,
        isInstallable: !!deferredPrompt || isIos,
        isIos,
        updateAvailable,
        showInstallModal,
        showInstallBanner,
        setShowInstallModal,
        dismissInstallBanner,
        triggerInstall,
        applyUpdate,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = () => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return context;
};
