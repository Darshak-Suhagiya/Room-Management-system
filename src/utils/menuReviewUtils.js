import { formatDateId } from './mealDateUtils'

export const REVIEW_RATINGS = {
  GOOD: 'good',
  OKAY: 'okay',
  BAD: 'bad',
}

export const REVIEW_RATING_LABELS = {
  [REVIEW_RATINGS.GOOD]: 'Good',
  [REVIEW_RATINGS.OKAY]: 'Okay',
  [REVIEW_RATINGS.BAD]: 'Bad',
}

/** Meal day + next 2 calendar days inclusive. */
export const REVIEW_WINDOW_DAYS = 2

export function addDaysToDateId(dateId, days) {
  const [y, m, d] = dateId.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return formatDateId(date)
}

/** True while today <= mealDate + REVIEW_WINDOW_DAYS. */
export function isReviewWindowOpen(mealDateId, todayId = formatDateId(new Date())) {
  if (!mealDateId) return false
  const deadline = addDaysToDateId(mealDateId, REVIEW_WINDOW_DAYS)
  return todayId <= deadline
}

export function normalizeReviewRating(rating) {
  if (
    rating === REVIEW_RATINGS.GOOD ||
    rating === REVIEW_RATINGS.OKAY ||
    rating === REVIEW_RATINGS.BAD
  ) {
    return rating
  }
  return null
}

export function hasReviewContent(review) {
  if (!review || typeof review !== 'object') return false
  const rating = normalizeReviewRating(review.rating)
  const text = (review.text ?? '').trim()
  return Boolean(rating || text)
}

export function getItemReview(reviews, itemId) {
  if (!reviews || typeof reviews !== 'object') return null
  const review = reviews[itemId]
  return hasReviewContent(review) ? review : null
}

/** Months back from a reference date id (calendar months). */
export function dateIdMonthsAgo(months, fromDateId = formatDateId(new Date())) {
  const [y, m, d] = fromDateId.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setMonth(date.getMonth() - months)
  return formatDateId(date)
}

/** Collect item ids from a menu slot object. */
export function collectSlotItemIds(slot) {
  if (!slot || typeof slot !== 'object') return []
  const ids = []
  for (const arr of Object.values(slot)) {
    if (Array.isArray(arr)) ids.push(...arr)
  }
  return ids
}

/**
 * Count how many times each item appeared on planned slots in [fromDateId, toDateId].
 * Each morning/evening appearance counts once.
 */
export function buildCookCounts(menus, fromDateId, toDateId = formatDateId(new Date())) {
  const counts = {}
  for (const menu of menus ?? []) {
    if (menu.date < fromDateId || menu.date > toDateId) continue
    const slots = []
    if (menu.hasMorning && menu.morning) slots.push(menu.morning)
    if (menu.hasEvening && menu.evening) slots.push(menu.evening)
    for (const slot of slots) {
      for (const id of collectSlotItemIds(slot)) {
        counts[id] = (counts[id] ?? 0) + 1
      }
    }
  }
  return counts
}

/**
 * Aggregate good/bad/okay counts per item from participations in date window.
 */
export function buildReviewSentimentByItem(participations, fromDateId, toDateId) {
  const byItem = {}
  for (const p of participations ?? []) {
    if (!p?.date || p.date < fromDateId || p.date > toDateId) continue
    if (p.notEating) continue
    const reviews = p.reviews ?? {}
    for (const [itemId, review] of Object.entries(reviews)) {
      if (!hasReviewContent(review)) continue
      if (!byItem[itemId]) {
        byItem[itemId] = { good: 0, okay: 0, bad: 0 }
      }
      const rating = normalizeReviewRating(review.rating)
      if (rating === REVIEW_RATINGS.GOOD) byItem[itemId].good += 1
      else if (rating === REVIEW_RATINGS.OKAY) byItem[itemId].okay += 1
      else if (rating === REVIEW_RATINGS.BAD) byItem[itemId].bad += 1
    }
  }
  return byItem
}

/** 'good' | 'bad' | null when tied / only okay / empty */
export function sentimentIndicator(counts) {
  if (!counts) return null
  const good = counts.good ?? 0
  const bad = counts.bad ?? 0
  if (good > bad) return REVIEW_RATINGS.GOOD
  if (bad > good) return REVIEW_RATINGS.BAD
  return null
}

/**
 * Past cook occasions for an item (newest first), each with reviews from that date+slot.
 * Optional fromDateId / toDateId filter the menu dates; limit caps results (null = all).
 */
export function getItemCookHistory(
  itemId,
  menus,
  participations,
  limit = 5,
  { fromDateId = null, toDateId = null } = {},
) {
  const occasions = []
  for (const menu of menus ?? []) {
    if (fromDateId && menu.date < fromDateId) continue
    if (toDateId && menu.date > toDateId) continue
    for (const slot of ['morning', 'evening']) {
      const hasSlot = slot === 'morning' ? menu.hasMorning : menu.hasEvening
      const slotData = slot === 'morning' ? menu.morning : menu.evening
      if (!hasSlot || !slotData) continue
      if (!collectSlotItemIds(slotData).includes(itemId)) continue
      const reviews = []
      for (const p of participations ?? []) {
        if (p.date !== menu.date || p.slot !== slot || p.notEating) continue
        const review = getItemReview(p.reviews, itemId)
        if (!review) continue
        reviews.push({
          userId: p.userId,
          displayName: review.displayName || 'Member',
          rating: normalizeReviewRating(review.rating),
          text: (review.text ?? '').trim(),
        })
      }
      occasions.push({ date: menu.date, slot, reviews })
    }
  }
  occasions.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return a.slot === 'morning' ? -1 : 1
  })
  if (limit == null || limit <= 0) return occasions
  return occasions.slice(0, limit)
}

export const ANALYTICS_RANGE_PRESETS = {
  ALL: 'all',
  LAST_30: '30',
  LAST_90: '90',
  CUSTOM: 'custom',
}

/**
 * Resolve analytics date window from preset / custom inputs.
 * All-time uses earliest planned menu date (or today if none).
 */
export function resolveAnalyticsRange(preset, customFrom, customTo, menus) {
  const today = formatDateId(new Date())
  let fromDateId = today
  let toDateId = today

  if (preset === ANALYTICS_RANGE_PRESETS.LAST_30) {
    fromDateId = addDaysToDateId(today, -30)
    toDateId = today
  } else if (preset === ANALYTICS_RANGE_PRESETS.LAST_90) {
    fromDateId = addDaysToDateId(today, -90)
    toDateId = today
  } else if (preset === ANALYTICS_RANGE_PRESETS.CUSTOM) {
    fromDateId = customFrom || today
    toDateId = customTo || today
    if (fromDateId > toDateId) {
      const swap = fromDateId
      fromDateId = toDateId
      toDateId = swap
    }
  } else {
    // all time
    let earliest = today
    for (const menu of menus ?? []) {
      if (menu?.date && menu.date < earliest) earliest = menu.date
    }
    fromDateId = earliest
    toDateId = today
  }

  return { fromDateId, toDateId }
}

/**
 * Flat rows for the analytics table: one per catalog item.
 */
export function buildItemAnalyticsRows(catalog, cookCounts, sentimentByItem) {
  const categories = catalog?.categories ?? []
  const catLabel = Object.fromEntries(
    categories.map((c) => [c.id, c.labelGu || c.labelEn || c.id]),
  )
  const items = catalog?.items ?? []
  return items.map((item) => {
    const counts = sentimentByItem[item.id] ?? { good: 0, okay: 0, bad: 0 }
    const good = counts.good ?? 0
    const okay = counts.okay ?? 0
    const bad = counts.bad ?? 0
    return {
      id: item.id,
      gu: item.gu || item.en || item.id,
      en: item.en || '',
      categoryId: item.categoryId,
      categoryLabel: catLabel[item.categoryId] ?? item.categoryId,
      timesMade: cookCounts[item.id] ?? 0,
      good,
      okay,
      bad,
      net: good - bad,
      totalReviews: good + okay + bad,
    }
  })
}

/** Count planned meal slots in [from, to]. */
export function countMealSlotsInRange(menus, fromDateId, toDateId) {
  let n = 0
  for (const menu of menus ?? []) {
    if (menu.date < fromDateId || menu.date > toDateId) continue
    if (menu.hasMorning) n += 1
    if (menu.hasEvening) n += 1
  }
  return n
}

export function flattenSelectedItemIds(slotMaps) {
  const ids = new Set()
  for (const slot of slotMaps ?? []) {
    for (const id of collectSlotItemIds(slot)) ids.add(id)
  }
  return [...ids]
}

/** Reviews for one item across slot participations. */
export function collectSlotItemReviews(participations, itemId) {
  const list = []
  for (const p of participations ?? []) {
    if (p.notEating) continue
    const review = getItemReview(p.reviews, itemId)
    if (!review) continue
    list.push({
      userId: p.userId,
      displayName: review.displayName || 'Member',
      rating: normalizeReviewRating(review.rating),
      text: review.text ?? '',
    })
  }
  return list
}
