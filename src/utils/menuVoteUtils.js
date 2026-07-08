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
      const override = totalOverrides[item.id]
      if (override !== undefined && isValidQuantity(override)) {
        stat.hasOverride = true
        stat.displayTotal = Number(override)
      } else {
        stat.displayTotal = stat.votedSum
      }
      stat.totalInteger = stat.displayTotal
    } else {
      stat.votedYesCount = stat.yes.length
      const override = totalOverrides[item.id]
      if (override !== undefined && isValidYesTotal(override)) {
        stat.hasOverride = true
        stat.displayYes = Number(override)
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
