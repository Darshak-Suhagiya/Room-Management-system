/**
 * Register the app service worker early so Chromium/Samsung can install the PWA.
 * Same SW also handles FCM (firebase-messaging-sw.js).
 */
export async function registerAppServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }
  const base = import.meta.env.BASE_URL || '/'
  const swUrl = `${base}firebase-messaging-sw.js`.replace(/\/{2,}/g, '/')
  try {
    const reg = await navigator.serviceWorker.register(swUrl, { scope: base })
    await navigator.serviceWorker.ready
    return reg
  } catch (err) {
    console.warn('Service worker registration failed:', err)
    return null
  }
}
