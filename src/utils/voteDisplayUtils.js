import { VOTE_TYPES } from '../config/voteTypes'
import { formatQuantity } from './voteQuantityUtils'

/** Card / summary line for vote dashboard. */
export function formatItemVoteSummary(stat, showVoteBreakdown) {
  if (stat.voteType === VOTE_TYPES.INTEGER) {
    const total = stat.displayTotal ?? 0
    if (
      showVoteBreakdown &&
      stat.hasOverride &&
      stat.votedSum !== total
    ) {
      return `${formatQuantity(total)} (${formatQuantity(stat.votedSum)} voted)`
    }
    return formatQuantity(total)
  }
  const yes = stat.displayYes ?? stat.yes.length
  if (
    showVoteBreakdown &&
    stat.hasOverride &&
    stat.votedYesCount !== yes
  ) {
    return `${yes} (${stat.votedYesCount} voted)`
  }
  return String(yes)
}
