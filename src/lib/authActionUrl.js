/** Continue URL for Firebase email action links (must be an authorized domain). */
export function getAuthActionUrl() {
  if (typeof window === 'undefined') return '/auth/action'
  return `${window.location.origin}/auth/action`
}
