import { ChevronDown, Moon, Sun } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeSwitcher({ compact = false }) {
  const { appearance, appearances, setAppearance, uiScale, uiScales, setUiScale } =
    useTheme()

  const ModeIcon = appearance === 'dark' ? Moon : Sun

  return (
    <div className={`theme-switcher ${compact ? 'theme-switcher-compact' : ''}`}>
      <label className="appearance-toggle" title="Light or dark mode">
        <ModeIcon size={18} className="appearance-toggle-icon" />
        <select
          className="appearance-toggle-select"
          value={appearance}
          onChange={(e) => setAppearance(e.target.value)}
          aria-label="Light or dark mode"
        >
          {appearances.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="appearance-toggle-chevron" />
      </label>
      {!compact && (
        <label className="theme-switcher-field">
          <span className="theme-switcher-label">Text size</span>
          <select
            className="theme-switcher-select"
            value={uiScale}
            onChange={(e) => setUiScale(e.target.value)}
            aria-label="Text size"
          >
            {uiScales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
