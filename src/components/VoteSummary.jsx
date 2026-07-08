import { useMemo } from 'react'
import { CalendarCheck, Moon, Sun, UserX, Users } from 'lucide-react'
import { buildVoteSummary } from '../utils/voteSummaryUtils'

function StatTile({ icon: Icon, tone, value, label }) {
  return (
    <div className="stat-card-tile">
      <span className={`stat-card-icon ${tone}`}>
        <Icon size={22} />
      </span>
      <div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
      </div>
    </div>
  )
}

export function VoteSummary({ mealSlots, statsByKey, totalMembers }) {
  const summary = useMemo(
    () => buildVoteSummary(mealSlots, statsByKey, totalMembers),
    [mealSlots, statsByKey, totalMembers],
  )

  if (summary.slotsWithStats === 0) return null

  return (
    <section className="vote-summary" aria-label="Summary">
      <div className="stat-cards">
        <StatTile
          icon={Users}
          tone="tone-primary"
          value={summary.totalMembers}
          label="Members in counts"
        />
        <StatTile
          icon={Sun}
          tone="tone-morning"
          value={summary.morningEating}
          label="Morning — eating"
        />
        <StatTile
          icon={Moon}
          tone="tone-evening"
          value={summary.eveningEating}
          label="Evening — eating"
        />
        <StatTile
          icon={CalendarCheck}
          tone="tone-accent"
          value={summary.slotsPlanned}
          label="Meal slots planned"
        />
        <StatTile
          icon={UserX}
          tone="tone-morning"
          value={summary.morningNotVoted}
          label="Morning — not voted"
        />
        <StatTile
          icon={UserX}
          tone="tone-evening"
          value={summary.eveningNotVoted}
          label="Evening — not voted"
        />
      </div>
    </section>
  )
}
