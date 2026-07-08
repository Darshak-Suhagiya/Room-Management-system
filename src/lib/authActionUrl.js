/** Continue URL for Firebase email action links (must be an authorized domain). */
export function getAuthActionUrl() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  if (typeof window === 'undefined') return `${base}/auth/action`
  return `${window.location.origin}${base}/auth/action`
}
