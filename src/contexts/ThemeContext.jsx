import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  APPEARANCE_LIST,
  APPEARANCES,
  DEFAULT_THEME_ID,
  THEMES,
  THEME_LIST,
} from '../config/themes'
import {
  applyAppearanceToDocument,
  applyThemeSettings,
  applyThemeToDocument,
  getStoredAppearance,
  getStoredThemeId,
  persistAppearance,
  persistThemeId,
} from '../lib/applyTheme'

function applyUiScaleToDocument(scaleId) {
  const scale = UI_SCALES[scaleId] ?? UI_SCALES.default
  if (scale.attr) {
    document.documentElement.setAttribute('data-ui-scale', scale.attr)
  } else {
    document.documentElement.removeAttribute('data-ui-scale')
  }
}

const UI_SCALE_STORAGE_KEY = 'rm-app-ui-scale'
const UI_SCALES = {
  default: { id: 'default', label: 'Default', attr: null },
  comfortable: { id: 'comfortable', label: 'Comfortable', attr: 'comfortable' },
  large: { id: 'large', label: 'Large', attr: 'large' },
}

function getStoredUiScale() {
  try {
    const stored = localStorage.getItem(UI_SCALE_STORAGE_KEY)
    return UI_SCALES[stored] ? stored : 'default'
  } catch {
    return 'default'
  }
}

function persistUiScale(scaleId) {
  try {
    localStorage.setItem(UI_SCALE_STORAGE_KEY, scaleId)
  } catch {
    /* ignore */
  }
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(() => getStoredThemeId())
  const [appearance, setAppearanceState] = useState(() => getStoredAppearance())
  const [uiScale, setUiScaleState] = useState(() => getStoredUiScale())

  const setTheme = useCallback((id) => {
    if (!THEMES[id]) return
    setThemeIdState(id)
    applyThemeToDocument(id)
    persistThemeId(id)
  }, [])

  const setAppearance = useCallback((id) => {
    if (!APPEARANCES[id]) return
    setAppearanceState(id)
    applyAppearanceToDocument(id)
    persistAppearance(id)
  }, [])

  const setUiScale = useCallback((scaleId) => {
    if (!UI_SCALES[scaleId]) return
    setUiScaleState(scaleId)
    applyUiScaleToDocument(scaleId)
    persistUiScale(scaleId)
  }, [])

  useEffect(() => {
    applyThemeSettings(themeId || DEFAULT_THEME_ID, appearance)
    applyUiScaleToDocument(uiScale)
  }, [themeId, appearance, uiScale])

  const theme = THEMES[themeId] ?? THEMES[DEFAULT_THEME_ID]

  const value = useMemo(
    () => ({
      theme,
      themes: THEME_LIST,
      setTheme,
      appearance,
      appearances: APPEARANCE_LIST,
      setAppearance,
      uiScale,
      uiScales: Object.values(UI_SCALES),
      setUiScale,
    }),
    [theme, appearance, uiScale, setTheme, setAppearance, setUiScale],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
