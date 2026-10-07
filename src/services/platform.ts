// What kind of device and window the app is running in.

export function isAppleMobile(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isMobile(): boolean {
  return isAppleMobile() || /Android/.test(navigator.userAgent);
}

/** Opened from the Home Screen (or as an installed app) rather than in a browser tab. */
export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}
