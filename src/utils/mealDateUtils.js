export function formatDateId(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isTodayDate(dateId) {
  return dateId === formatDateId(new Date())
}

/** Strictly before today (local calendar date). */
export function isPastDate(dateId) {
  return dateId < formatDateId(new Date())
}

export function getTomorrowDateId() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return formatDateId(d)
}

export function isTomorrowDate(dateId) {
  return dateId === getTomorrowDateId()
}

export function filterSlotsTodayAndTomorrow(slots) {
  const today = formatDateId(new Date())
  const tomorrow = getTomorrowDateId()
  return slots.filter((s) => s.date === today || s.date === tomorrow)
}

export function filterSlotsByDate(slots, dateId) {
  if (!dateId) return slots
  return slots.filter((s) => s.date === dateId)
}

/** Unique planned dates from menus, newest first */
export function getPlannedDateIds(menus) {
  const dates = new Set()
  for (const menu of menus) {
    if (menu.hasMorning || menu.hasEvening) dates.add(menu.date)
  }
  return [...dates].sort((a, b) => b.localeCompare(a))
}

/** Today first, then tomorrow; within each day morning before evening */
export function sortSlotsTodayThenTomorrow(slots) {
  const today = formatDateId(new Date())
  const tomorrow = getTomorrowDateId()
  return [...slots].sort((a, b) => {
    const dayOrder = (date) => {
      if (date === today) return 0
      if (date === tomorrow) return 1
      return 2
    }
    const byDate = dayOrder(a.date) - dayOrder(b.date)
    if (byDate !== 0) return byDate
    return a.slot === 'morning' ? -1 : 1
  })
}

export function formatDisplayDateGu(dateId) {
  const [y, m, d] = dateId.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** e.g. { line1: 'MAY 22', line2: 'Friday' } */
export function formatMealDayHeader(dateId) {
  const [y, m, d] = dateId.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const line1 = date
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase()
  const line2 = date.toLocaleDateString('en-US', { weekday: 'long' })
  return { line1, line2 }
}

/** Newest / future dates first */
export function sortMenusByDateDesc(menus) {
  return [...menus].sort((a, b) => b.date.localeCompare(a.date))
}

/** Flatten menus into individual meal slots for pagination */
export function expandMenusToMealSlots(menus) {
  const slots = []
  for (const menu of menus) {
    if (menu.hasMorning) {
      slots.push({
        key: `${menu.date}-morning`,
        date: menu.date,
        slot: 'morning',
        menu,
      })
    }
    if (menu.hasEvening) {
      slots.push({
        key: `${menu.date}-evening`,
        date: menu.date,
        slot: 'evening',
        menu,
      })
    }
  }
  return slots
}
