import { LEAVE_PERIODS } from '../config/constants'
import { expenseBillablePaise, expenseFromFundPaise, expenseGrossPaise } from './financeSplit'
import { currentPeriodId } from './money'

export function daysInMonthFor(periodId) {
  if (!periodId || !/^\d{4}-\d{2}$/.test(periodId)) return 30
  const [year, month] = periodId.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function formatLeaveDays(value) {
  const n = Number(value) || 0
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(1)
}

export function leavePeriodLine(period) {
  if (period === LEAVE_PERIODS.FULL) return 'Full day'
  if (period === LEAVE_PERIODS.MORNING) return 'Morning (half day)'
  if (period === LEAVE_PERIODS.EVENING) return 'Evening (half day)'
  return period || ''
}

export function formatCookLeaveDate(dateId) {
  if (!dateId) return ''
  const [year, month, day] = String(dateId).split('-').map(Number)
  if (!year || !month || !day) return String(dateId)
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function asHalfDays(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 2) / 2
}

function clampHalfDays(value, max) {
  const cap = Math.max(0, asHalfDays(max))
  const stepped = asHalfDays(value)
  if (stepped <= 0) return 0
  return Math.min(stepped, cap)
}

export function cookLeaveFundMovementId(collectionId, expenseId) {
  return `cookleave_${collectionId}_${expenseId}`
}

export function computeCookLeave(input = {}) {
  const salaryPaise = Math.max(0, Math.round(Number(input.salaryPaise) || 0))
  const daysInMonth = Math.max(1, Math.round(Number(input.daysInMonth) || 30))
  const leaveDays = asHalfDays(input.leaveDays)
  const waivedDays = clampHalfDays(input.waivedDays, leaveDays)
  const deductDays = asHalfDays(leaveDays - waivedDays)
  const perDayPaise = Math.round(salaryPaise / daysInMonth)
  const deductionPaise = Math.round((salaryPaise * deductDays) / daysInMonth)
  const destination = input.destination || inferDestination(input, deductionPaise)
  let toFundPaise = Math.round(Number(input.toFundPaise) || 0)
  if (destination === 'fund') toFundPaise = deductionPaise
  else if (destination === 'less') toFundPaise = 0
  toFundPaise = Math.min(Math.max(0, toFundPaise), deductionPaise)
  const billReductionPaise = deductionPaise - toFundPaise
  const cookGetsPaise = salaryPaise - deductionPaise
  const billedPaise = cookGetsPaise + toFundPaise
  return {
    perDayPaise,
    deductDays,
    deductionPaise,
    destination,
    toFundPaise,
    billReductionPaise,
    cookGetsPaise,
    billedPaise,
    waivedDays,
    leaveDays,
    daysInMonth,
    salaryPaise,
  }
}

function inferDestination(input, deductionPaise) {
  if (input.destination === 'less' || input.destination === 'fund' || input.destination === 'split') {
    return input.destination
  }
  const toFund = Math.round(Number(input.toFundPaise) || 0)
  if (deductionPaise > 0 && toFund >= deductionPaise) return 'fund'
  if (toFund > 0) return 'split'
  return 'less'
}

export function serializeCookLeave(raw) {
  if (!raw || raw.enabled === false) return null
  const computed = computeCookLeave(raw)
  return {
    enabled: true,
    cookUserId: raw.cookUserId || null,
    cookName: String(raw.cookName || '').trim(),
    monthId: raw.monthId || '',
    daysInMonth: computed.daysInMonth,
    leaveDays: computed.leaveDays,
    leaveEntries: Array.isArray(raw.leaveEntries)
      ? raw.leaveEntries.map((entry) => ({
          date: entry?.date || '',
          period: entry?.period || '',
          reason: entry?.reason || '',
        }))
      : [],
    leavesLoadedAt: raw.leavesLoadedAt || null,
    waivedDays: computed.waivedDays,
    deductDays: computed.deductDays,
    salaryPaise: computed.salaryPaise,
    perDayPaise: computed.perDayPaise,
    deductionPaise: computed.deductionPaise,
    destination: computed.destination,
    toFundPaise: computed.toFundPaise,
    billReductionPaise: computed.billReductionPaise,
    cookGetsPaise: computed.cookGetsPaise,
    billedPaise: computed.billedPaise,
  }
}

export function applyCookLeavePatch(expense, patch = {}) {
  if (patch.enabled === false) {
    const salaryPaise = expense.cookLeave?.salaryPaise ?? expense.amountPaise ?? 0
    const next = {
      ...expense,
      cookLeave: null,
      amountPaise: salaryPaise,
    }
    return { ...next, fromFundPaise: expenseFromFundPaise(next) }
  }
  const current = expense.cookLeave && typeof expense.cookLeave === 'object' ? expense.cookLeave : {}
  const next = {
    ...current,
    ...patch,
    enabled: true,
    salaryPaise:
      patch.salaryPaise !== undefined
        ? patch.salaryPaise
        : (current.salaryPaise ?? expense.amountPaise ?? 0),
  }
  const cookLeave = serializeCookLeave(next)
  const patched = {
    ...expense,
    cookLeave,
    amountPaise: cookLeave.billedPaise,
  }
  return { ...patched, fromFundPaise: expenseFromFundPaise(patched) }
}

export function enableCookLeave(expense) {
  const monthId = expense.cookLeave?.monthId || expense.periodId || currentPeriodId()
  return applyCookLeavePatch(expense, {
    enabled: true,
    monthId,
    daysInMonth: expense.cookLeave?.daysInMonth || daysInMonthFor(monthId),
    salaryPaise: expense.cookLeave?.salaryPaise ?? expense.amountPaise ?? 0,
    waivedDays: expense.cookLeave?.waivedDays ?? 0,
    destination: expense.cookLeave?.destination || 'less',
    toFundPaise: expense.cookLeave?.toFundPaise ?? 0,
    leaveDays: expense.cookLeave?.leaveDays ?? 0,
    leaveEntries: expense.cookLeave?.leaveEntries || [],
  })
}

export function cookLeaveFactRows(cookLeave) {
  if (!cookLeave?.enabled) return []
  const computed = computeCookLeave(cookLeave)
  const rows = [
    { key: 'salary', label: 'Salary', value: computed.salaryPaise, kind: 'money' },
    { key: 'daysInMonth', label: 'Days in month', value: String(computed.daysInMonth), kind: 'text' },
    { key: 'perDay', label: 'Per day', value: computed.perDayPaise, kind: 'money' },
    { key: 'leaveDays', label: 'Leaves', value: formatLeaveDays(computed.leaveDays), kind: 'text' },
    { key: 'waived', label: 'Waived', value: formatLeaveDays(computed.waivedDays), kind: 'text' },
    {
      key: 'cutting',
      label: 'Cutting',
      value: `${formatLeaveDays(computed.deductDays)} days`,
      kind: 'text',
    },
    { key: 'cut', label: 'Cut amount', value: computed.deductionPaise, kind: 'money' },
    { key: 'cookGets', label: 'Cook is paid', value: computed.cookGetsPaise, kind: 'money' },
    { key: 'billed', label: 'Members billed', value: computed.billedPaise, kind: 'money' },
  ]
  if (computed.toFundPaise > 0) {
    rows.push({ key: 'toFund', label: 'To room fund', value: computed.toFundPaise, kind: 'money' })
  }
  if (computed.billReductionPaise > 0) {
    rows.push({
      key: 'billedLess',
      label: 'Billed less',
      value: computed.billReductionPaise,
      kind: 'money',
    })
  }
  return rows
}

export function cookLeaveFundPaiseFromSnapshots(snapshots = []) {
  return (snapshots || []).reduce((sum, snap) => {
    const cookLeave = snap?.cookLeave
    if (!cookLeave?.enabled) return sum
    return sum + Math.max(0, Math.round(Number(cookLeave.toFundPaise) || 0))
  }, 0)
}

export function cookLeaveFundLinesFromSnapshots(snapshots = []) {
  return (snapshots || [])
    .filter((snap) => snap?.cookLeave?.enabled && (snap.cookLeave.toFundPaise || 0) > 0)
    .map((snap) => ({
      expenseId: snap.expenseId,
      name: snap.name || 'Cook salary',
      cookName: snap.cookLeave.cookName || 'Cook',
      deductDays: snap.cookLeave.deductDays,
      amountPaise: Math.max(0, Math.round(Number(snap.cookLeave.toFundPaise) || 0)),
    }))
}

export function memberCookLeaveShare(expense, userId) {
  const cookLeave = expense?.cookLeave
  if (!cookLeave?.enabled || !userId) return { sharePaise: 0, toFundPaise: 0 }
  const sharePaise =
    expense.perUser?.find((row) => row.userId === userId)?.sharePaise ??
    expense.perUserPaise?.[userId] ??
    0
  const amount = expenseBillablePaise(expense) || expenseGrossPaise(expense)
  const toFund = Math.max(0, Math.round(Number(cookLeave.toFundPaise) || 0))
  const toFundPaise = amount > 0 ? Math.round((toFund * sharePaise) / amount) : 0
  return { sharePaise, toFundPaise }
}
