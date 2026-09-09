import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const DISMISSED_KEY = 'nr-install-dismissed';
const ENGAGEMENT_TIME_MS = 30000;
const DISMISSED_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function isDismissed() {
  const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY));
  return Boolean(dismissedAt) && Date.now() - dismissedAt < DISMISSED_COOLDOWN_MS;
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function useInstallPrompt() {
  const location = useLocation();
  const [entryPath] = useState(location.pathname);
  const [visitedSecondRoute, setVisitedSecondRoute] = useState(false);
  const [spentEnoughTime, setSpentEnoughTime] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(isDismissed);

  useEffect(() => {
    if (location.pathname !== entryPath) setVisitedSecondRoute(true);
  }, [location.pathname, entryPath]);

  useEffect(() => {
    const timer = setTimeout(() => setSpentEnoughTime(true), ENGAGEMENT_TIME_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const platform = isIOS() ? 'ios' : deferredPrompt ? 'android' : null;
  const canInstall =
    !dismissed &&
    !isStandalone() &&
    (visitedSecondRoute || spentEnoughTime) &&
    platform !== null;

  async function promptInstall() {
    if (!deferredPrompt) return;
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'pwa_install_banner_click');
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setDismissed(true);
  }

  return { canInstall, platform, promptInstall, dismiss };
}
