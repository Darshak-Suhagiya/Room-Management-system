import { emptySevaSlot } from '../config/defaultSevaSeed'

function cloneConfig(config) {
  return JSON.parse(JSON.stringify(config))
}

function clearDragSource(config, from) {
  if (!from || from.type === 'pool') return
  if (from.type === 'daily') {
    const slots = config.assignments[from.dayId]?.[from.groupId]
    if (slots?.[from.slotIndex]) {
      slots[from.slotIndex] = emptySevaSlot()
    }
  }
  if (from.type === 'weekly') {
    const task = config.weeklyTasks.find((t) => t.id === from.taskId)
    if (task?.personIds?.[from.taskIndex] !== undefined) {
      task.personIds[from.taskIndex] = null
    }
  }
}

function ensureDayGroupSlots(next, dayId, groupId) {
  if (!next.assignments[dayId]) next.assignments[dayId] = {}
  if (!next.assignments[dayId][groupId]) {
    const group = next.dailyGroups.find((g) => g.id === groupId)
    next.assignments[dayId][groupId] = Array.from(
      { length: group?.slotCount ?? 1 },
      () => emptySevaSlot(),
    )
  }
  return next.assignments[dayId][groupId]
}

export function assignDailySlot(config, dayId, groupId, slotIndex, personId, note, from) {
  const next = cloneConfig(config)
  const slots = ensureDayGroupSlots(next, dayId, groupId)
  const isSame =
    from?.type === 'daily' &&
    from.dayId === dayId &&
    from.groupId === groupId &&
    from.slotIndex === slotIndex

  const incoming = {
    personId: personId || null,
    note: note ?? '',
  }
  const existing = slots[slotIndex]

  if (
    !isSame &&
    from?.type === 'daily' &&
    existing?.personId &&
    incoming.personId
  ) {
    const fromSlots = ensureDayGroupSlots(next, from.dayId, from.groupId)
    fromSlots[from.slotIndex] = { ...existing }
    slots[slotIndex] = incoming
    return next
  }

  if (!isSame) clearDragSource(next, from)
  slots[slotIndex] = incoming
  return next
}

export function clearDailySlot(config, dayId, groupId, slotIndex) {
  return assignDailySlot(config, dayId, groupId, slotIndex, null, '', null)
}

export function updateDailySlotNote(config, dayId, groupId, slotIndex, note) {
  const next = cloneConfig(config)
  const slot = next.assignments[dayId]?.[groupId]?.[slotIndex]
  if (slot) slot.note = note
  return next
}

export function addWeeklyPerson(config, taskId, personId, from) {
  const next = cloneConfig(config)
  const task = next.weeklyTasks.find((t) => t.id === taskId)
  if (!task) return next
  if (!task.personIds) task.personIds = []
  clearDragSource(next, from)
  if (!task.personIds.includes(personId)) {
    task.personIds.push(personId)
  }
  return next
}

export function removeWeeklyPerson(config, taskId, index) {
  const next = cloneConfig(config)
  const task = next.weeklyTasks.find((t) => t.id === taskId)
  if (task?.personIds) task.personIds.splice(index, 1)
  return next
}

export function addPerson(config, name) {
  const next = cloneConfig(config)
  const id = name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
  if (next.people.some((p) => p.id === id)) return next
  next.people.push({ id, name, userId: null })
  return next
}

export function removePerson(config, personId) {
  const next = cloneConfig(config)
  next.people = next.people.filter((p) => p.id !== personId)
  for (const dayId of Object.keys(next.assignments)) {
    for (const groupId of Object.keys(next.assignments[dayId])) {
      next.assignments[dayId][groupId] = next.assignments[dayId][groupId].map(
        (slot) =>
          slot.personId === personId ? emptySevaSlot() : slot,
      )
    }
  }
  next.weeklyTasks = next.weeklyTasks.map((t) => ({
    ...t,
    personIds: (t.personIds ?? []).filter((id) => id !== personId),
  }))
  return next
}

export function linkPersonUser(config, personId, userId) {
  const next = cloneConfig(config)
  const person = next.people.find((p) => p.id === personId)
  if (person) person.userId = userId
  return next
}

export function renamePerson(config, personId, name) {
  const next = cloneConfig(config)
  const person = next.people.find((p) => p.id === personId)
  if (person) person.name = name
  return next
}

export function editDailyGroup(config, groupId, patch) {
  const next = cloneConfig(config)
  const group = next.dailyGroups.find((g) => g.id === groupId)
  if (group) Object.assign(group, patch)
  return next
}

export function addDailyGroup(config, code, description) {
  const next = cloneConfig(config)
  const id = code.toLowerCase().replace(/\s+/g, '_')
  next.dailyGroups.push({
    id,
    code,
    description,
    slotCount: 4,
    loadKey: code.startsWith('S') ? code.split('_')[0] : null,
    sortOrder: next.dailyGroups.length,
  })
  for (const day of next.weekDays) {
    if (!next.assignments[day.id]) next.assignments[day.id] = {}
    next.assignments[day.id][id] = Array.from({ length: 4 }, () => emptySevaSlot())
  }
  return next
}

export function removeDailyGroup(config, groupId) {
  const next = cloneConfig(config)
  next.dailyGroups = next.dailyGroups.filter((g) => g.id !== groupId)
  for (const dayId of Object.keys(next.assignments)) {
    delete next.assignments[dayId][groupId]
  }
  return next
}

export function addWeeklyTask(config, title = 'New task') {
  const next = cloneConfig(config)
  next.weeklyTasks.push({
    id: `wt_${Date.now()}`,
    title,
    personIds: [],
  })
  return next
}

export function removeWeeklyTask(config, taskId) {
  const next = cloneConfig(config)
  next.weeklyTasks = next.weeklyTasks.filter((t) => t.id !== taskId)
  return next
}

export function editWeeklyTaskTitle(config, taskId, title) {
  const next = cloneConfig(config)
  const task = next.weeklyTasks.find((t) => t.id === taskId)
  if (task) task.title = title
  return next
}

function padWeeklyTask(task, columnCount) {
  const ids = [...(task.personIds ?? [])]
  while (ids.length < columnCount) ids.push(null)
  task.personIds = ids.slice(0, columnCount)
}

export function getWeeklyColumnCount(config) {
  const fromConfig = config.weeklyColumnCount
  if (fromConfig) return fromConfig
  return Math.max(
    4,
    ...config.weeklyTasks.map((t) => (t.personIds ?? []).length),
  )
}

export function addDailyColumn(config) {
  const next = cloneConfig(config)
  for (const group of next.dailyGroups) {
    group.slotCount = (group.slotCount ?? 1) + 1
    for (const day of next.weekDays) {
      const slots = ensureDayGroupSlots(next, day.id, group.id)
      slots.push(emptySevaSlot())
    }
  }
  return next
}

export function removeDailyColumn(config) {
  const next = cloneConfig(config)
  const minCols = 1
  const current = next.dailyGroups[0]?.slotCount ?? 1
  if (current <= minCols) return next
  for (const group of next.dailyGroups) {
    group.slotCount = current - 1
    for (const day of next.weekDays) {
      const slots = next.assignments[day.id]?.[group.id]
      if (slots) slots.pop()
    }
  }
  return next
}

export function addWeeklyColumn(config) {
  const next = cloneConfig(config)
  const count = getWeeklyColumnCount(next) + 1
  next.weeklyColumnCount = count
  for (const task of next.weeklyTasks) {
    padWeeklyTask(task, count)
    task.personIds.push(null)
  }
  return next
}

export function removeWeeklyColumn(config) {
  const next = cloneConfig(config)
  const count = getWeeklyColumnCount(next)
  if (count <= 1) return next
  next.weeklyColumnCount = count - 1
  for (const task of next.weeklyTasks) {
    padWeeklyTask(task, count - 1)
    task.personIds = task.personIds.slice(0, count - 1)
  }
  return next
}

export function assignWeeklySlot(config, taskId, columnIndex, personId, from) {
  const next = cloneConfig(config)
  const task = next.weeklyTasks.find((t) => t.id === taskId)
  if (!task) return next
  const colCount = getWeeklyColumnCount(next)
  padWeeklyTask(task, colCount)

  const isSame =
    from?.type === 'weekly' &&
    from.taskId === taskId &&
    from.taskIndex === columnIndex

  const existingId = task.personIds[columnIndex]
  if (
    !isSame &&
    from?.type === 'weekly' &&
    existingId &&
    personId
  ) {
    const fromTask = next.weeklyTasks.find((t) => t.id === from.taskId)
    if (fromTask) {
      padWeeklyTask(fromTask, colCount)
      fromTask.personIds[from.taskIndex] = existingId
    }
    task.personIds[columnIndex] = personId
    return next
  }

  if (!isSame) clearDragSource(next, from)
  task.personIds[columnIndex] = personId || null
  return next
}

export function clearWeeklySlot(config, taskId, columnIndex) {
  return assignWeeklySlot(config, taskId, columnIndex, null, null)
}
