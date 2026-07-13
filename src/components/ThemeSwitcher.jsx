import { useEffect, useId, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  CloudSun,
  Flower2,
  Leaf,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  Waves,
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const THEME_ICONS = {
  Waves,
  CloudSun,
  Leaf,
  Sunrise,
  Sparkles,
  Flower2,
}

function ThemeIcon({ name, size = 18 }) {
  const Icon = THEME_ICONS[name] ?? Waves
  return <Icon size={size} aria-hidden />
}

export function ThemeSwitcher({ compact = false }) {
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

  const [menuOpen, setMenuOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      themes.findIndex((t) => t.id === theme.id),
    ),
  )
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const listboxId = useId()
  const ModeIcon = appearance === 'dark' ? Moon : Sun
  const CurrentIcon = THEME_ICONS[theme.icon] ?? Waves

  useEffect(() => {
    if (!menuOpen) return undefined

    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setMenuOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const idx = themes.findIndex((t) => t.id === theme.id)
    setActiveIndex(idx >= 0 ? idx : 0)
    queueMicrotask(() => {
      listRef.current?.querySelector('[data-active="true"]')?.focus()
    })
  }, [menuOpen, theme.id, themes])

  const selectThemeAt = (index) => {
    const next = themes[index]
    if (!next) return
    setTheme(next.id)
    setMenuOpen(false)
  }

  const moveActive = (nextIndex) => {
    setActiveIndex(nextIndex)
    queueMicrotask(() => {
      listRef.current
        ?.querySelectorAll('[role="option"]')
        [nextIndex]?.focus()
    })
  }

  const onListKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveActive((activeIndex + 1) % themes.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveActive((activeIndex - 1 + themes.length) % themes.length)
    } else if (e.key === 'Home') {
      e.preventDefault()
      moveActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      moveActive(themes.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectThemeAt(activeIndex)
    }
  }

  return (
    <div
      ref={rootRef}
      className={`theme-switcher ${compact ? 'theme-switcher-compact' : ''}`}
    >
      <div className="theme-picker">
        <button
          type="button"
          className="theme-picker-trigger"
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          aria-controls={listboxId}
          title="Color theme"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <CurrentIcon size={18} className="theme-picker-trigger-icon" />
          {!compact && <span className="theme-picker-trigger-label">{theme.name}</span>}
          <ChevronDown size={16} className="theme-picker-chevron" />
        </button>

        {menuOpen && (
          <ul
            ref={listRef}
            id={listboxId}
            className="theme-picker-menu"
            role="listbox"
            aria-label="Color theme"
            tabIndex={-1}
            onKeyDown={onListKeyDown}
          >
            {themes.map((t, index) => {
              const selected = t.id === theme.id
              const active = index === activeIndex
              return (
                <li key={t.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-active={active ? 'true' : undefined}
                    className={`theme-picker-option${selected ? ' is-selected' : ''}${active ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectThemeAt(index)}
                  >
                    <span className="theme-picker-option-icon">
                      <ThemeIcon name={t.icon} size={18} />
                    </span>
                    <span className="theme-picker-option-meta">
                      <span className="theme-picker-option-name">{t.name}</span>
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
                    </span>
                    {selected && (
                      <Check size={16} className="theme-picker-check" aria-hidden />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

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
