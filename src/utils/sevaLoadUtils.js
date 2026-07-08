/** Compute per-person seva load counts (S1–S5 + total) */

export function computePersonLoads(config) {
  const { people, dailyGroups, weekDays, assignments, weeklyTasks, loadColumns } =
    config

  const loads = {}
  for (const person of people) {
    loads[person.id] = Object.fromEntries(
      loadColumns.map((k) => [k, 0]),
    )
    loads[person.id].Total = 0
  }

  for (const day of weekDays) {
    const dayAssign = assignments[day.id] ?? {}
    for (const group of dailyGroups) {
      if (!group.loadKey) continue
      const slots = dayAssign[group.id] ?? []
      for (const slot of slots) {
        if (!slot?.personId) continue
        if (!loads[slot.personId]) continue
        loads[slot.personId][group.loadKey] =
          (loads[slot.personId][group.loadKey] ?? 0) + 1
      }
    }
  }

  for (const task of weeklyTasks) {
    for (const personId of task.personIds ?? []) {
      if (!personId || personId === null || !loads[personId]) continue
      loads[personId].S5 = (loads[personId].S5 ?? 0) + 1
    }
  }

  for (const person of people) {
    let total = 0
    for (const col of loadColumns) {
      total += loads[person.id][col] ?? 0
    }
    loads[person.id].Total = total
  }

  return loads
}

export function getPersonById(people, personId) {
  return people.find((p) => p.id === personId) ?? null
}

export function displayPersonName(person, note = '') {
  if (!person) return note ? '-' : ''
  const base = person.name
  if (note) return `${base}(${note})`
  return base
}
