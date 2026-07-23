/** Light tap feedback on supported devices (Android PWA). No-op on iOS/desktop. */
export function triggerSelectionHaptic() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(10)
  }
}
