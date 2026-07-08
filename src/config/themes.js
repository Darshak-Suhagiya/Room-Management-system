/** Teal + Slate — single app theme; light / dark appearance only. */
export const THEME_STORAGE_KEY = 'rm-app-theme'
export const APPEARANCE_STORAGE_KEY = 'rm-app-appearance'

export const APP_THEME = {
  id: 'teal-slate',
  name: 'Teal + Slate',
  description: 'Calm, clean, professional admin dashboard palette',
}

export const APPEARANCES = {
  light: { id: 'light', label: 'Light' },
  dark: { id: 'dark', label: 'Dark' },
}

export const APPEARANCE_LIST = Object.values(APPEARANCES)
export const DEFAULT_APPEARANCE = 'light'

export function isValidAppearance(id) {
  return id != null && Object.prototype.hasOwnProperty.call(APPEARANCES, id)
}

/** @deprecated kept for storage migration — always teal-slate */
export const DEFAULT_THEME_ID = APP_THEME.id

export function isValidThemeId() {
  return true
}
