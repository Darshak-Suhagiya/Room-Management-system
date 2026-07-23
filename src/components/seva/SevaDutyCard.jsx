import { getSevaGroupIcon, getSevaToneClass } from '../../utils/sevaIconMap'
import { getPersonById } from '../../utils/sevaLoadUtils'

function PersonChip({ person, note, isYou }) {
  if (!person) {
    return <span className="seva-assignee is-open">Open</span>
  }
  return (
    <span className={`seva-assignee${isYou ? ' is-you' : ''}`}>
      <span className="seva-assignee-name">{person.name}</span>
      {note ? <span className="seva-assignee-note">({note})</span> : null}
      {isYou ? <span className="seva-you-badge">You</span> : null}
    </span>
  )
}

export function SevaDutyCard({
  group,
  slots,
  people,
  linkedPersonId,
  compact = false,
  toneIndex = 0,
}) {
  const Icon = getSevaGroupIcon(group.code)
  const toneClass = getSevaToneClass(group, toneIndex)
  const filled = (slots ?? []).filter((s) => s?.personId)

  return (
    <article className={`seva-duty-card${compact ? ' is-compact' : ''}`}>
      <header className="seva-duty-card-head">
        <span className={`seva-duty-icon ${toneClass}`} aria-hidden>
          <Icon size={compact ? 16 : 20} />
        </span>
        <div className="seva-duty-titles">
          <span className={`seva-duty-code ${toneClass}`}>{group.code}</span>
        </div>
      </header>
      <div className="seva-duty-assignees">
        {(slots ?? []).map((slot, idx) => {
          const person = getPersonById(people, slot?.personId)
          return (
            <PersonChip
              key={`${group.id}-${idx}`}
              person={person}
              note={slot?.note}
              isYou={Boolean(person && person.id === linkedPersonId)}
            />
          )
        })}
        {filled.length === 0 && (slots ?? []).length === 0 && (
          <span className="seva-assignee is-open">Open</span>
        )}
      </div>
    </article>
  )
}
