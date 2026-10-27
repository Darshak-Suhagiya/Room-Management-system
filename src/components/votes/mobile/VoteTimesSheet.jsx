import { Modal } from '../../ui/Modal'
import { MEAL_SLOTS } from '../../../config/menuItems'
import { DefaultChip } from '../../defaults/DefaultChip'
import { formatDisplayDateGu, formatVoteTimestamp } from '../../../utils/mealDateUtils'
import { getSlotVoteTimeline } from '../../../utils/menuVoteUtils'
import '../voteTimes.css'

function menuUpdatedLine(menu, slot) {
  const edit = menu?.slotEdits?.[slot]
  if (!edit?.at) return ''
  const when = formatVoteTimestamp(edit.at)
  if (!when) return ''
  return edit.displayName
    ? `Menu updated by ${edit.displayName} · ${when}`
    : `Menu updated · ${when}`
}

export function VoteTimesSheet({ open, onClose, entries = [], subtitle = '' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vote times"
      subtitle={subtitle}
      fullScreenMobile
      artKey="votes"
    >
      <div className="vote-times vote-times-mobile">
        {entries.length === 0 ? (
          <p className="vote-times-none">No menu planned for this day.</p>
        ) : (
          entries.map(({ entry, stats }) => {
            const people = getSlotVoteTimeline(stats?.mealSummary)
            const menuLine = menuUpdatedLine(entry.menu, entry.slot)
            return (
              <section
                key={entry.key}
                className={`vote-times-section is-${entry.slot}`}
              >
                <header className="vote-times-section-head">
                  <h3 className="vote-times-section-title">
                    {formatDisplayDateGu(entry.date)} · {MEAL_SLOTS[entry.slot].labelEn}
                  </h3>
                  {menuLine ? <p className="vote-times-menu-line">{menuLine}</p> : null}
                </header>
                {people.length === 0 ? (
                  <p className="vote-times-empty">No votes saved yet</p>
                ) : (
                  <div>
                    {people.map((person) => (
                      <div key={person.userId} className="vote-times-row">
                        <div className="vote-times-who">
                          <span className="vote-times-name">{person.name}</span>
                          {person.notEating ? (
                            <span className="vote-times-status">Not eating</span>
                          ) : null}
                          <DefaultChip participation={person} compact />
                        </div>
                        <span className="vote-times-when">
                          {formatVoteTimestamp(person.at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>
    </Modal>
  )
}
