import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { getSevaGroupIcon, getSevaToneClass } from '../../utils/sevaIconMap'

/** Collapsible legend explaining each seva group code once. */
export function SevaGroupLegend({ dailyGroups }) {
  const [open, setOpen] = useState(false)

  return (
    <section className={`seva-group-legend rail-card${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="seva-group-legend-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="seva-group-legend-toggle-left">
          <span className="seva-section-icon" aria-hidden>
            <Info size={18} />
          </span>
          <span>
            <strong>What is S1, S2, S3, S4?</strong>
            <span className="muted"> Tap to see each seva description</span>
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`seva-group-legend-chevron${open ? ' is-open' : ''}`}
        />
      </button>

      {open && (
        <ul className="seva-group-legend-list">
          {(dailyGroups ?? []).map((group, index) => {
            const Icon = getSevaGroupIcon(group.code)
            const toneClass = getSevaToneClass(group, index)
            return (
              <li key={group.id} className="seva-group-legend-item">
                <span className={`seva-duty-icon ${toneClass}`} aria-hidden>
                  <Icon size={16} />
                </span>
                <div>
                  <span className={`seva-duty-code ${toneClass}`}>
                    {group.code}
                  </span>
                  <p className="seva-duty-desc">{group.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
