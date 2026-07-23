import { useMemo } from 'react'
import { Sun, UserX, Users } from 'lucide-react'
import { buildVoteSummary } from '../../../utils/voteSummaryUtils'

export function VotesSummaryStrip({ mealSlots, statsByKey, totalMembers }) {
  const summary = useMemo(
    () => buildVoteSummary(mealSlots, statsByKey, totalMembers),
    [mealSlots, statsByKey, totalMembers],
  )

  if (summary.slotsWithStats === 0) return null

  const eating = summary.morningEating + summary.eveningEating
  const notVoted = summary.morningNotVoted + summary.eveningNotVoted

  return (
    <section className="votes-mobile-summary-strip" aria-label="Summary">
      <div className="votes-mobile-summary-tile">
        <Users size={16} aria-hidden />
        <div>
          <strong>{summary.totalMembers}</strong>
          <span className="muted">Members</span>
        </div>
      </div>
      <div className="votes-mobile-summary-tile">
        <Sun size={16} aria-hidden />
        <div>
          <strong>{eating}</strong>
          <span className="muted">Eating</span>
        </div>
      </div>
      <div className="votes-mobile-summary-tile">
        <UserX size={16} aria-hidden />
        <div>
          <strong>{notVoted}</strong>
          <span className="muted">Not voted</span>
        </div>
      </div>
    </section>
  )
}
