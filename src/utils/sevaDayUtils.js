/** Map JS Date.getDay() (0=Sun … 6=Sat) to seva weekDays ids (Mon–Fri). */
const JS_DAY_TO_WEEK_ID = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
}

export function getTodayWeekDayId() {
  return JS_DAY_TO_WEEK_ID[new Date().getDay()] ?? null
}

/** Default selected day: today if Mon–Fri, otherwise Monday. */
export function getDefaultWeekDayId(weekDays = []) {
  const todayId = getTodayWeekDayId()
  if (todayId && weekDays.some((d) => d.id === todayId)) return todayId
  return weekDays[0]?.id ?? 'monday'
}

export function getWeekDayLabel(weekDays, dayId) {
  return weekDays.find((d) => d.id === dayId)?.label ?? dayId
}

export function isWeekend() {
  const d = new Date().getDay()
  return d === 0 || d === 6
}

/** Find seva person linked to the signed-in auth uid, if any. */
export function findLinkedPerson(people, userId) {
  if (!userId || !people?.length) return null
  return people.find((p) => p.userId === userId) ?? null
}

/**
 * Collect daily + weekly assignments for one person.
 * Pass dayId for daily slots; weekly tasks are always included when personId is set.
 */
export function getPersonSevaForDay(config, personId, dayId) {
  if (!config || !personId) {
    return { daily: [], weekly: [] }
  }

  const daily = []
  if (dayId) {
    const dayAssign = config.assignments?.[dayId] ?? {}
    for (const group of config.dailyGroups ?? []) {
      const slots = dayAssign[group.id] ?? []
      for (const slot of slots) {
        if (slot?.personId === personId) {
          daily.push({
            group,
            note: slot.note ?? '',
          })
        }
      }
    }
  }

  const weekly = []
  for (const task of config.weeklyTasks ?? []) {
    if ((task.personIds ?? []).includes(personId)) {
      weekly.push(task)
    }
  }

  return { daily, weekly }
}
