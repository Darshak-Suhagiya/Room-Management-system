import {
  Droplets,
  HandHelping,
  Home,
  Sparkles,
  Star,
  UtensilsCrossed,
} from 'lucide-react'

export const SEVA_TONE_COUNT = 10

/** Stable code → preferred tone (theme-first colors). */
const CODE_TONE = {
  S1: 0,
  S2: 1,
  S2_R1: 1,
  EXTRA: 2,
  S3: 3,
  S4: 4,
  S4_W: 4,
  S4_IND: 4,
  S5: 5,
}

/** lucide icon component for a daily seva group code. */
export function getSevaGroupIcon(code) {
  const key = String(code ?? '').toUpperCase()
  if (key === 'S1') return UtensilsCrossed
  if (key.startsWith('S2')) return Home
  if (key === 'EXTRA') return Star
  if (key === 'S3') return Sparkles
  if (key.startsWith('S4')) return Droplets
  return HandHelping
}

/**
 * Tone index 0–9 for a seva group.
 * Known codes map to theme-friendly colors; others use sortOrder/fallbackIndex.
 */
export function getSevaToneIndex(group, fallbackIndex = 0) {
  const key = String(group?.code ?? '')
    .toUpperCase()
    .replace(/\s+/g, '_')
  if (key in CODE_TONE) return CODE_TONE[key]
  if (key.startsWith('S2')) return CODE_TONE.S2
  if (key.startsWith('S4')) return CODE_TONE.S4
  const order =
    typeof group?.sortOrder === 'number' ? group.sortOrder : fallbackIndex
  return ((order % SEVA_TONE_COUNT) + SEVA_TONE_COUNT) % SEVA_TONE_COUNT
}

export function getSevaToneClass(group, fallbackIndex = 0) {
  return `seva-tone-${getSevaToneIndex(group, fallbackIndex)}`
}
