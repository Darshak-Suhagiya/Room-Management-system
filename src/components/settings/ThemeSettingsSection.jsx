import {
  Check,
  CloudSun,
  Flower2,
  Leaf,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  Waves,
} from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

const THEME_ICONS = {
  Waves,
  CloudSun,
  Leaf,
  Sunrise,
  Sparkles,
  Flower2,
}

function ThemeIcon({ name, size = 20 }) {
  const Icon = THEME_ICONS[name] ?? Waves
  return <Icon size={size} aria-hidden />
}

export function ThemeSettingsSection() {
  const {
    theme,
    themes,
    setTheme,
    appearance,
    appearances,
    setAppearance,
    uiScale,
    uiScales,
    setUiScale,
  } = useTheme()

  return (
    <section className="settings-section">
      <h3 className="settings-section-title">Appearance</h3>
      <p className="settings-section-desc muted">
        Color theme, light or dark mode, and text size.
      </p>

      <div className="theme-settings-grid" role="listbox" aria-label="Color theme">
        {themes.map((t) => {
          const selected = t.id === theme.id
          return (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`theme-settings-option${selected ? ' is-selected' : ''}`}
              onClick={() => setTheme(t.id)}
            >
              <span className="theme-settings-option-icon">
                <ThemeIcon name={t.icon} />
              </span>
              <span className="theme-settings-option-name">{t.name}</span>
              <span className="theme-picker-swatches" aria-hidden>
                <span
                  className="theme-picker-swatch"
                  style={{ background: t.swatches.primary }}
                />
                <span
                  className="theme-picker-swatch"
                  style={{ background: t.swatches.accent }}
                />
                <span
                  className="theme-picker-swatch"
                  style={{
                    background: t.swatches.surface,
                    boxShadow: 'inset 0 0 0 1px var(--border)',
                  }}
                />
              </span>
              {selected && (
                <Check size={18} className="theme-settings-check" aria-hidden />
              )}
            </button>
          )
        })}
      </div>

      <div className="settings-field">
        <span className="settings-field-label">Mode</span>
        <div className="segmented-control settings-appearance-seg" role="group" aria-label="Light or dark mode">
          {appearances.map((a) => {
            const Icon = a.id === 'dark' ? Moon : Sun
            return (
              <button
                key={a.id}
                type="button"
                className={`segmented-btn${appearance === a.id ? ' is-active' : ''}`}
                onClick={() => setAppearance(a.id)}
              >
                <Icon size={16} aria-hidden />
                {a.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="settings-field">
        <label className="settings-field-label" htmlFor="settings-ui-scale">
          Text size
        </label>
        <select
          id="settings-ui-scale"
          className="settings-select"
          value={uiScale}
          onChange={(e) => setUiScale(e.target.value)}
        >
          {uiScales.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}
