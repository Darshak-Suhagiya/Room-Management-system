import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  isValidAppearance,
  isValidThemeId,
} from '../config/themes'

export function getStoredThemeId() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isValidThemeId(stored) ? stored : DEFAULT_THEME_ID
  } catch {
    return DEFAULT_THEME_ID
  }
}

export function getStoredAppearance() {
  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY)
    return isValidAppearance(stored) ? stored : DEFAULT_APPEARANCE
  } catch {
    return DEFAULT_APPEARANCE
  }
}

/** Opt out of Android/Samsung auto-dark inversion when the app chose light. */
function appearanceColorScheme(appearance) {
  return appearance === 'dark' ? 'only dark' : 'only light'
}

export function applyAppearanceToDocument(appearance) {
  const id = isValidAppearance(appearance) ? appearance : DEFAULT_APPEARANCE
  const scheme = appearanceColorScheme(id)
  document.documentElement.setAttribute('data-appearance', id)
  document.documentElement.style.colorScheme = scheme

  let meta = document.querySelector('meta[name="color-scheme"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'color-scheme'
    document.head.prepend(meta)
  }
  meta.content = scheme

  let supported = document.querySelector('meta[name="supported-color-schemes"]')
  if (!supported) {
    supported = document.createElement('meta')
    supported.name = 'supported-color-schemes'
    document.head.prepend(supported)
  }
  supported.content = id === 'dark' ? 'dark' : 'light'
}

export function applyThemeToDocument(themeId) {
  const id = isValidThemeId(themeId) ? themeId : DEFAULT_THEME_ID
  document.documentElement.setAttribute('data-theme', id)
}

/** Sync PWA / mobile browser chrome with the active theme header color. */
export function applyBrowserThemeColor() {
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue('--header-bg')
    .trim()
  if (!color) return

  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = color

  const appearance = document.documentElement.getAttribute('data-appearance')
  const appleMeta = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  )
  if (appleMeta) {
    appleMeta.content = appearance === 'dark' ? 'black-translucent' : 'default'
  }
}

export function applyThemeSettings(themeId, appearance) {
  applyThemeToDocument(themeId)
  applyAppearanceToDocument(appearance)
  applyBrowserThemeColor()
}

export function persistThemeId(themeId) {
  if (!isValidThemeId(themeId)) return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId)
  } catch {
    /* ignore */
  }
}

export function persistAppearance(appearance) {
  if (!isValidAppearance(appearance)) return
  try {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance)
  } catch {
    /* ignore */
  }
}
