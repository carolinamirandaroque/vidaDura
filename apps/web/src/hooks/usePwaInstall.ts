import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function isIos() {
  return !isAndroid() && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export type PwaInstallHint = 'ios' | 'android' | null;

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode);
  const [isIosDevice] = useState(isIos);
  const [isAndroidDevice] = useState(isAndroid);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setIsInstalled(true);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const canInstall = Boolean(deferredPrompt) && !isInstalled;
  const manualHint: PwaInstallHint =
    !isInstalled && !deferredPrompt
      ? isIosDevice
        ? 'ios'
        : isAndroidDevice
          ? 'android'
          : null
      : null;

  return { canInstall, isInstalled, manualHint, install };
}
