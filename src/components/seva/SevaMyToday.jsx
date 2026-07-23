import { CalendarCheck, Link2Off, UserRound } from 'lucide-react'
import { getSevaGroupIcon } from '../../utils/sevaIconMap'

export function SevaMyToday({
  linkedPerson,
  todayLabel,
  isWeekend,
  daily,
  weekly,
}) {
  if (!linkedPerson) {
    return (
      <section className="seva-my-today rail-card">
        <div className="seva-my-today-head">
          <span className="seva-my-today-icon" aria-hidden>
            <Link2Off size={20} />
          </span>
          <div>
            <h3>Your seva</h3>
            <p className="muted">
              No seva person is linked to your account yet. Ask an admin to link
              you in Seva Admin.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const hasDaily = daily.length > 0
  const hasWeekly = weekly.length > 0
  const free = !hasDaily && !hasWeekly

  return (
    <section className="seva-my-today rail-card is-linked">
      <div className="seva-my-today-head">
        <span className="seva-my-today-icon" aria-hidden>
          <UserRound size={20} />
        </span>
        <div>
          <h3>
            Your seva · {linkedPerson.name}
            {isWeekend ? ' (weekend)' : todayLabel ? ` · ${todayLabel}` : ''}
          </h3>
          <p className="muted">
            {isWeekend
              ? 'No daily board on weekends — weekly tasks still count.'
              : free
                ? 'You’re free on the daily board today.'
                : 'Here’s what you’re assigned today.'}
          </p>
        </div>
      </div>

      {(hasDaily || hasWeekly) && (
        <ul className="seva-my-today-list">
          {daily.map(({ group, note }) => {
            const Icon = getSevaGroupIcon(group.code)
            return (
              <li key={`${group.id}-${note}`} className="seva-my-today-item">
                <span className="seva-my-today-item-icon" aria-hidden>
                  <Icon size={16} />
                </span>
                <span>
                  <strong>{group.code}</strong>
                  <span className="muted"> — {group.description}</span>
                  {note ? ` (${note})` : ''}
                </span>
              </li>
            )
          })}
          {weekly.map((task) => (
            <li key={task.id} className="seva-my-today-item">
              <span className="seva-my-today-item-icon" aria-hidden>
                <CalendarCheck size={16} />
              </span>
              <span>
                <strong>S5</strong>
                <span className="muted"> — {task.title}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
