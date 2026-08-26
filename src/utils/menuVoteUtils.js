import { VOTE_TYPES, defaultVoteTypeForCategory } from '../config/voteTypes'
import {
  formatQuantity,
  isValidQuantity,
  isValidYesTotal,
} from './voteQuantityUtils'

/** Items planned for a slot on a given day */
export function getPlannedMenuItems(menu, slotKey, catalog) {
  if (!menu || !catalog?.categories) return []
  const slot = menu[slotKey]
  if (!slot) return []

  const planned = []
  for (const cat of catalog.categories) {
    for (const itemId of slot[cat.id] ?? []) {
      const item = catalog.items.find((i) => i.id === itemId)
      if (item) {
        planned.push({
          ...item,
          categoryId: cat.id,
          categoryLabelGu: cat.labelGu,
          categoryLabelEn: cat.labelEn,
          voteType:
            item.voteType ?? defaultVoteTypeForCategory(item.categoryId),
        })
      }
    }
  }
  return planned
}

/**
 * Resolve kitchen-lead override to a display total.
 * New shape: { total, baseline } → live + (total − baseline)
 * Legacy bare number: absolute total (frozen until re-adjusted)
 */
export function resolveOverrideDisplay(override, liveSum, validate) {
  if (override === undefined || override === null || override === '') {
    return null
  }

  if (typeof override === 'object' && !Array.isArray(override)) {
    const total = Number(override.total)
    if (!validate(total)) return null
    const baseline = Number(override.baseline)
    if (!Number.isFinite(baseline)) return total
    return Math.max(0, liveSum + (total - baseline))
  }

  if (!validate(override)) return null
  return Number(override)
}

export function buildVoteStats({
  users,
  participations,
  plannedItems,
  totalOverrides = {},
}) {
  const participationByUser = new Map(
    participations.map((p) => [p.userId, p]),
  )

  const mealSummary = {
    totalUsers: users.length,
    notEating: [],
    notVotedMeal: [],
    votedMeal: [],
  }

  for (const user of users) {
    const p = participationByUser.get(user.id)
    const label = user.displayName || user.email || user.id
    if (p?.notEating) {
      mealSummary.notEating.push({ userId: user.id, name: label })
    } else if (!p || !hasAnyVote(p, plannedItems)) {
      mealSummary.notVotedMeal.push({ userId: user.id, name: label })
    } else {
      mealSummary.votedMeal.push({ userId: user.id, name: label })
    }
  }

  const itemStats = plannedItems.map((item) => {
    const stat = {
      item,
      voteType: item.voteType,
      yes: [],
      no: [],
      notVoted: [],
      totalInteger: 0,
      votedSum: 0,
      displayTotal: 0,
      votedYesCount: 0,
      displayYes: 0,
      hasOverride: false,
      integerVotes: [],
    }

    for (const user of users) {
      const p = participationByUser.get(user.id)
      const name = user.displayName || user.email || user.id

      if (p?.notEating) continue

      const val = getVoteValue(p?.votes, item.id)
      if (item.voteType === VOTE_TYPES.INTEGER) {
        if (val === undefined || val === null || val === '') {
          stat.notVoted.push({ userId: user.id, name })
        } else {
          const num = Number(val)
          if (isValidQuantity(num)) {
            stat.votedSum += num
            stat.integerVotes.push({ userId: user.id, name, value: num })
          } else {
            stat.notVoted.push({ userId: user.id, name })
          }
        }
      } else if (val === true) {
        stat.yes.push({ userId: user.id, name })
      } else if (val === false) {
        stat.no.push({ userId: user.id, name })
      } else {
        stat.notVoted.push({ userId: user.id, name })
      }
    }

    if (item.voteType === VOTE_TYPES.INTEGER) {
      const resolved = resolveOverrideDisplay(
        totalOverrides[item.id],
        stat.votedSum,
        isValidQuantity,
      )
      if (resolved !== null) {
        stat.hasOverride = true
        // Keep half-step precision for quantity totals
        const rounded = Math.round(resolved * 2) / 2
        stat.displayTotal = rounded
      } else {
        stat.displayTotal = stat.votedSum
      }
      stat.totalInteger = stat.displayTotal
    } else {
      stat.votedYesCount = stat.yes.length
      const resolved = resolveOverrideDisplay(
        totalOverrides[item.id],
        stat.votedYesCount,
        isValidYesTotal,
      )
      if (resolved !== null) {
        stat.hasOverride = true
        stat.displayYes = Math.round(resolved)
      } else {
        stat.displayYes = stat.yes.length
      }
    }

    return stat
  })

  return { mealSummary, itemStats }
}

export function getVoteValue(votes, itemId) {
  const v = votes?.[itemId]
  if (v && typeof v === 'object' && 'value' in v) return v.value
  return v
}

export function isVoteAnswered(item, val) {
  if (item.voteType === VOTE_TYPES.INTEGER) {
    return isValidQuantity(val)
  }
  return val === true || val === false
}

export function getMissingVoteItemIds(plannedItems, votes, notEating) {
  if (notEating) return []
  return plannedItems
    .filter((item) => !isVoteAnswered(item, getVoteValue(votes, item.id)))
    .map((item) => item.id)
}

/** INTEGER items with a non-empty but invalid quantity. */
export function getInvalidVoteItemIds(plannedItems, votes, notEating) {
  if (notEating) return []
  return plannedItems
    .filter((item) => {
      if (item.voteType !== VOTE_TYPES.INTEGER) return false
      const val = getVoteValue(votes, item.id)
      if (val === undefined || val === null || val === '') return false
      return !isValidQuantity(val)
    })
    .map((item) => item.id)
}

export function hasMealVoteComplete(participation, plannedItems) {
  if (!participation) return false
  if (participation.notEating) return true
  if (plannedItems.length === 0) return false
  return (
    getMissingVoteItemIds(
      plannedItems,
      participation.votes,
      participation.notEating,
    ).length === 0
  )
}

function hasAnyVote(participation, plannedItems) {
  if (!participation?.votes) return false
  return plannedItems.some((item) => {
    const val = getVoteValue(participation.votes, item.id)
    if (val === undefined || val === null || val === '') return false
    return true
  })
}

export function formatVoteDisplay(item, val) {
  if (item.voteType === VOTE_TYPES.INTEGER) {
    return formatQuantity(val)
  }
  if (val === true) return 'Yes'
  if (val === false) return 'No'
  return '—'
}

/** True if the user ate this item (yes vote or quantity > 0). */
export function isReviewableItem(item, votes) {
  const val = getVoteValue(votes, item.id)
  if (item.voteType === VOTE_TYPES.INTEGER) {
    const num = Number(val)
    return isValidQuantity(num) && num > 0
  }
  return val === true
}

/** Planned items the user actually ate — eligible for dish reviews. */
export function getReviewableItems(plannedItems, votes) {
  if (!plannedItems?.length) return []
  return plannedItems.filter((item) => isReviewableItem(item, votes))
}
