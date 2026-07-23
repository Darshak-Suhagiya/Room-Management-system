/** Multi-theme registry — color personality × light/dark appearance. */

export const THEME_STORAGE_KEY = 'rm-app-theme'
export const APPEARANCE_STORAGE_KEY = 'rm-app-appearance'

export const THEMES = {
  'teal-slate': {
    id: 'teal-slate',
    name: 'Teal + Slate',
    description: 'Calm, clean, professional admin dashboard palette',
    icon: 'Waves',
    swatches: {
      primary: '#0d9488',
      accent: '#2563eb',
      surface: '#ffffff',
    },
  },
  'ocean-azure': {
    id: 'ocean-azure',
    name: 'Ocean Azure',
    description: 'Clear sky coastal product UI',
    icon: 'CloudSun',
    swatches: {
      primary: '#0284c7',
      accent: '#0d9488',
      surface: '#ffffff',
    },
  },
  evergreen: {
    id: 'evergreen',
    name: 'Evergreen',
    description: 'Nature-calm kitchen-friendly greens',
    icon: 'Leaf',
    swatches: {
      primary: '#15803d',
      accent: '#0f766e',
      surface: '#ffffff',
    },
  },
  'amber-dusk': {
    id: 'amber-dusk',
    name: 'Amber Dusk',
    description: 'Warm hospitality and meal energy',
    icon: 'Sunrise',
    swatches: {
      primary: '#d97706',
      accent: '#c2410c',
      surface: '#ffffff',
    },
  },
  'indigo-mist': {
    id: 'indigo-mist',
    name: 'Indigo Mist',
    description: 'Modern refined muted indigo',
    icon: 'Sparkles',
    swatches: {
      primary: '#4f46e5',
      accent: '#0891b2',
      surface: '#ffffff',
    },
  },
  'clay-rose': {
    id: 'clay-rose',
    name: 'Clay Rose',
    description: 'Editorial dusty rose and terracotta',
    icon: 'Flower2',
    swatches: {
      primary: '#c45c6a',
      accent: '#b45309',
      surface: '#ffffff',
    },
  },
}

export const THEME_LIST = Object.values(THEMES)
export const DEFAULT_THEME_ID = 'teal-slate'

/** @deprecated use THEMES[DEFAULT_THEME_ID] */
export const APP_THEME = THEMES[DEFAULT_THEME_ID]

export const APPEARANCES = {
  light: { id: 'light', label: 'Light' },
  dark: { id: 'dark', label: 'Dark' },
}

export const APPEARANCE_LIST = Object.values(APPEARANCES)
export const DEFAULT_APPEARANCE = 'light'

export function isValidAppearance(id) {
  return id != null && Object.prototype.hasOwnProperty.call(APPEARANCES, id)
}

export function isValidThemeId(id) {
  return id != null && Object.prototype.hasOwnProperty.call(THEMES, id)
}
