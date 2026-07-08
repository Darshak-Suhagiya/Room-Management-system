import { formatDisplayDateGu } from './mealDateUtils'

/**
 * Aggregate loaded slot stats into dashboard summary figures.
 * Only slots that already have stats loaded are counted.
 */
export function buildVoteSummary(mealSlots, statsByKey, totalMembers) {
  const perDate = new Map()
  let morningEating = 0
  let eveningEating = 0
  let morningNotVoted = 0
  let eveningNotVoted = 0
  let totalEating = 0
  let totalNotEating = 0
  let totalNotVoted = 0
  let slotsWithStats = 0

  for (const entry of mealSlots) {
    const stats = statsByKey[entry.key]
    if (!stats?.mealSummary) continue
    slotsWithStats += 1

    const { notEating = [], notVotedMeal = [], votedMeal = [] } =
      stats.mealSummary
    // Eating = members who submitted a vote and are eating (not "not eating")
    const eating = votedMeal.length
    const notVoted = notVotedMeal.length

    if (entry.slot === 'morning') {
      morningEating += eating
      morningNotVoted += notVoted
    } else {
      eveningEating += eating
      eveningNotVoted += notVoted
    }

    totalEating += eating
    totalNotEating += notEating.length
    totalNotVoted += notVoted

    if (!perDate.has(entry.date)) {
      perDate.set(entry.date, {
        date: entry.date,
        label: formatDisplayDateGu(entry.date),
        morning: 0,
        evening: 0,
      })
    }
    const row = perDate.get(entry.date)
    if (entry.slot === 'morning') row.morning += eating
    else row.evening += eating
  }

  return {
    totalMembers,
    morningEating,
    eveningEating,
    morningNotVoted,
    eveningNotVoted,
    slotsPlanned: mealSlots.length,
    slotsWithStats,
    chartData: Array.from(perDate.values()),
    breakdown: [
      { name: 'Eating (voted)', value: totalEating - totalNotVoted, key: 'voted' },
      { name: 'Eating (no vote)', value: totalNotVoted, key: 'notVoted' },
      { name: 'Not eating', value: totalNotEating, key: 'notEating' },
    ].filter((d) => d.value > 0),
  }
}
