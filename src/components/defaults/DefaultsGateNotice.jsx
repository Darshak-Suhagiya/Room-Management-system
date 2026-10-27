import { Link } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { formatDisplayDateGu } from '../../utils/mealDateUtils'
import './defaults.css'

const VISIBLE = 6

/**
 * Shown on My Meals while planned dishes (on days you default to Eating) have
 * no default vote yet. Voting stays closed until they are set.
 */
export function DefaultsGateNotice({ gate }) {
  if (!gate?.count) return null
  const shown = gate.items.slice(0, VISIBLE)
  const more = gate.count - shown.length

  return (
    <section className="defaults-gate" aria-label="Default votes needed">
      <header className="defaults-gate-head">
        <span className="defaults-gate-icon" aria-hidden>
          <SlidersHorizontal size={18} />
        </span>
        <div>
          <h3>Update default votes first</h3>
          <p>
            Your default is Eating, but {gate.count}{' '}
            {gate.count === 1 ? 'planned dish has' : 'planned dishes have'} no
            default vote. Set {gate.count === 1 ? 'it' : 'them'}, then you can
            vote here.
          </p>
        </div>
      </header>
      <ul className="defaults-gate-list">
        {shown.map(({ item, dates }) => (
          <li key={item.id}>
            <strong>{item.gu}</strong>
            <span>
              {formatDisplayDateGu(dates[0])}
              {dates.length > 1 ? ` +${dates.length - 1} more` : ''}
            </span>
          </li>
        ))}
      </ul>
      {more > 0 ? <p className="defaults-gate-more">{more} more dishes</p> : null}
      <Link to="/defaults?missing=1" className="btn btn-primary btn-sm defaults-gate-btn">
        Update default votes
      </Link>
    </section>
  )
}
