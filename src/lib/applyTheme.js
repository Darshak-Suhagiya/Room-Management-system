import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  isValidAppearance,
} from '../config/themes'

export function getStoredThemeId() {
  return 'teal-slate'
}

export function getStoredAppearance() {
  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY)
    return isValidAppearance(stored) ? stored : DEFAULT_APPEARANCE
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function applyAppearanceToDocument(appearance) {
  const id = isValidAppearance(appearance) ? appearance : DEFAULT_APPEARANCE
  document.documentElement.setAttribute('data-appearance', id)
  document.documentElement.style.colorScheme = id
}

export function applyThemeSettings(_themeId, appearance) {
  applyAppearanceToDocument(appearance)
}

export function applyThemeToDocument() {
  /* single theme — appearance only */
}

export function persistThemeId() {
  /* no-op */
}

export function persistAppearance(appearance) {
  if (!isValidAppearance(appearance)) return
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance)
  } catch {
    /* ignore */
  }
}
