/** Distinct chip colors per person — one unique color each (admin UI) */

const CHIP_PALETTE = [
  { bg: '#dbeafe', border: '#1d4ed8', text: '#1e3a8a' },
  { bg: '#fce7f3', border: '#be185d', text: '#831843' },
  { bg: '#bbf7d0', border: '#15803d', text: '#14532d' },
  { bg: '#fef08a', border: '#a16207', text: '#713f12' },
  { bg: '#ddd6fe', border: '#6d28d9', text: '#4c1d95' },
  { bg: '#fed7aa', border: '#c2410c', text: '#7c2d12' },
  { bg: '#a5f3fc', border: '#0e7490', text: '#164e63' },
  { bg: '#f5d0fe', border: '#a21caf', text: '#701a75' },
  { bg: '#bef264', border: '#4d7c0f', text: '#365314' },
  { bg: '#fecdd3', border: '#be123c', text: '#881337' },
  { bg: '#c7d2fe', border: '#4338ca', text: '#312e81' },
  { bg: '#99f6e4', border: '#0f766e', text: '#134e4a' },
  { bg: '#fde68a', border: '#b45309', text: '#78350f' },
  { bg: '#e9d5ff', border: '#9333ea', text: '#581c87' },
  { bg: '#bfdbfe', border: '#0369a1', text: '#0c4a6e' },
  { bg: '#fbcfe8', border: '#db2777', text: '#9d174d' },
  { bg: '#d9f99d', border: '#65a30d', text: '#3f6212' },
  { bg: '#fcd34d', border: '#d97706', text: '#92400e' },
  { bg: '#a7f3d0', border: '#047857', text: '#064e3b' },
  { bg: '#fda4af', border: '#e11d48', text: '#9f1239' },
]

function colorFromGoldenAngle(index) {
  const hue = Math.round((index * 137.508) % 360)
  return {
    bg: `hsl(${hue}, 75%, 88%)`,
    border: `hsl(${hue}, 70%, 38%)`,
    text: `hsl(${hue}, 80%, 18%)`,
  }
}

export function colorAtIndex(index) {
  if (index < CHIP_PALETTE.length) return CHIP_PALETTE[index]
  return colorFromGoldenAngle(index)
}

/** Stable unique color per person (sorted by name) */
export function buildPersonColorMap(people) {
  const map = {}
  if (!people?.length) return map

  const sorted = [...people].sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id, 'gu', {
      sensitivity: 'base',
    }),
  )

  sorted.forEach((person, index) => {
    map[person.id] = colorAtIndex(index)
  })

  return map
}

/** @deprecated use color map from context */
export function getPersonChipColors() {
  return null
}
