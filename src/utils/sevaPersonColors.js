/** Distinct chip colors per person — one unique color each (admin UI) */

const CHIP_PALETTE_LIGHT = [
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

/** Low-chroma chips for dark appearance — readable without glow */
const CHIP_PALETTE_DARK = [
  { bg: '#1a2438', border: '#5a8fc4', text: '#b8d0ea' },
  { bg: '#2a1a28', border: '#c46a9a', text: '#e8b8d0' },
  { bg: '#152a24', border: '#4db89a', text: '#a8dcc8' },
  { bg: '#2a2114', border: '#d4a84b', text: '#e8d4a0' },
  { bg: '#1e2238', border: '#8b9ad4', text: '#c4cce8' },
  { bg: '#2a2018', border: '#d4996a', text: '#e8c8a8' },
  { bg: '#172830', border: '#5aafd4', text: '#b0d8ea' },
  { bg: '#281a2a', border: '#b87ab0', text: '#e0c0d8' },
  { bg: '#1e2a18', border: '#8ab84a', text: '#c8dca0' },
  { bg: '#2a1719', border: '#e88989', text: '#f0c4c4' },
  { bg: '#1a2038', border: '#7a8ad4', text: '#c0c8e8' },
  { bg: '#16302c', border: '#2cb5a0', text: '#a8dcc8' },
  { bg: '#2a2414', border: '#c4983a', text: '#e0c878' },
  { bg: '#241a30', border: '#a88ac4', text: '#d4c0e8' },
  { bg: '#172830', border: '#4a9ab8', text: '#b0d0e0' },
  { bg: '#2a1824', border: '#d47aa0', text: '#e8b8d0' },
  { bg: '#1e2a18', border: '#7aaa4a', text: '#c4dca0' },
  { bg: '#2a2114', border: '#c4883a', text: '#e0c090' },
  { bg: '#152a24', border: '#3d9a7a', text: '#a0d4bc' },
  { bg: '#2a1719', border: '#d46a7a', text: '#e8b0b8' },
]

function colorFromGoldenAngle(index, dark) {
  const hue = Math.round((index * 137.508) % 360)
  if (dark) {
    return {
      bg: `hsl(${hue}, 28%, 16%)`,
      border: `hsl(${hue}, 42%, 55%)`,
      text: `hsl(${hue}, 35%, 78%)`,
    }
  }
  return {
    bg: `hsl(${hue}, 75%, 88%)`,
    border: `hsl(${hue}, 70%, 38%)`,
    text: `hsl(${hue}, 80%, 18%)`,
  }
}

export function colorAtIndex(index, appearance = 'light') {
  const dark = appearance === 'dark'
  const palette = dark ? CHIP_PALETTE_DARK : CHIP_PALETTE_LIGHT
  if (index < palette.length) return palette[index]
  return colorFromGoldenAngle(index, dark)
}

/** Stable unique color per person (sorted by name) */
export function buildPersonColorMap(people, appearance = 'light') {
  const map = {}
  if (!people?.length) return map

  const sorted = [...people].sort((a, b) =>
    (a.name || a.id).localeCompare(b.name || b.id, 'gu', {
      sensitivity: 'base',
    }),
  )

  sorted.forEach((person, index) => {
    map[person.id] = colorAtIndex(index, appearance)
  })

  return map
}

/** @deprecated use color map from context */
export function getPersonChipColors() {
  return null
}
