/**
 * Toggle html.glass-ok / html.glass-fallback for progressive glass chrome.
 * Honors prefers-reduced-transparency and CSS.supports for backdrop-filter.
 */
export function applyGlassSupportClass() {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  let reduced = false
  try {
    reduced = window.matchMedia('(prefers-reduced-transparency: reduce)').matches
  } catch {
    reduced = false
  }

  const blurOk =
    !reduced &&
    typeof CSS !== 'undefined' &&
    (CSS.supports('backdrop-filter', 'blur(1px)') ||
      CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))

  root.classList.toggle('glass-ok', blurOk)
  root.classList.toggle('glass-fallback', !blurOk)
}
