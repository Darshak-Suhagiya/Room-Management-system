import { FINANCE_SPLIT_MODES } from '../config/constants'

function sortedIds(ids) {
  return [...new Set((ids || []).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b)),
  )
}

function asIntPaise(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.round(v)
}

/**
 * Equal split. Remainder of 1 paise is distributed in stable userId order
 * so the shares always sum to totalPaise.
 */
export function splitEqual(totalPaise, userIds) {
  const ids = sortedIds(userIds)
  const total = asIntPaise(totalPaise)
  if (ids.length === 0) {
    throw new Error('Select at least one person to split this expense.')
  }
  if (total < 0) throw new Error('Expense amount cannot be negative.')
  const base = Math.floor(total / ids.length)
  let remainder = total - base * ids.length
  const shares = {}
  for (const id of ids) {
    const extra = remainder > 0 ? 1 : 0
    if (remainder > 0) remainder -= 1
    shares[id] = base + extra
  }
  return shares
}

/**
 * Largest-remainder method so share weights still sum exactly to totalPaise.
 */
export function splitByShares(totalPaise, weights) {
  const entries = Object.entries(weights || {})
    .filter(([id, w]) => id && Number(w) > 0)
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
  if (entries.length === 0) {
    throw new Error('Give at least one person a share greater than 0.')
  }
  const total = asIntPaise(totalPaise)
  if (total < 0) throw new Error('Expense amount cannot be negative.')
  const weightSum = entries.reduce((s, [, w]) => s + Number(w), 0)
  const floors = entries.map(([id, w]) => {
    const exact = (total * Number(w)) / weightSum
    const floor = Math.floor(exact)
    return { id, floor, frac: exact - floor }
  })
  let assigned = floors.reduce((s, r) => s + r.floor, 0)
  let leftover = total - assigned
  floors.sort((a, b) => b.frac - a.frac || a.id.localeCompare(b.id))
  const shares = {}
  for (const row of floors) shares[row.id] = row.floor
  for (const row of floors) {
    if (leftover <= 0) break
    shares[row.id] += 1
    leftover -= 1
  }
  return shares
}

export function splitManual(totalPaise, amounts) {
  const total = asIntPaise(totalPaise)
  const shares = {}
  let sum = 0
  for (const [id, raw] of Object.entries(amounts || {})) {
    if (!id) continue
    const n = asIntPaise(raw)
    if (n < 0) throw new Error('Manual amounts cannot be negative.')
    shares[id] = n
    sum += n
  }
  if (Object.keys(shares).length === 0) {
    throw new Error('Enter a manual amount for at least one person.')
  }
  if (sum !== total) {
    throw new Error(
      `Manual amounts must add up to the amount billed to people (off by ${sum - total} paise).`,
    )
  }
  return shares
}

export function expenseGrossPaise(expense) {
  if (expense?.cookLeave?.enabled) {
    return Math.max(0, asIntPaise(expense.cookLeave.billedPaise ?? expense.amountPaise))
  }
  return Math.max(0, asIntPaise(expense?.amountPaise))
}

export function expenseFromFundPaise(expense) {
  const gross = expenseGrossPaise(expense)
  const raw = asIntPaise(expense?.fromFundPaise)
  if (raw <= 0 || gross <= 0) return 0
  return Math.min(raw, gross)
}

export function expenseBillablePaise(expense) {
  return expenseGrossPaise(expense) - expenseFromFundPaise(expense)
}

export function withClampedFromFund(expense) {
  if (!expense || typeof expense !== 'object') return expense
  return {
    ...expense,
    fromFundPaise: expenseFromFundPaise(expense),
  }
}

export function fromFundMovementId(collectionId, expenseId) {
  return `fromfund_${collectionId}_${expenseId}`
}

export function fromFundPaymentId(collectionId, expenseId) {
  return `fromfundpay_${collectionId}_${expenseId}`
}

export function fromFundPaiseFromSnapshots(snapshots = []) {
  return (snapshots || []).reduce((sum, snap) => sum + expenseFromFundPaise(snap), 0)
}

export function fromFundLinesFromSnapshots(snapshots = []) {
  return (snapshots || [])
    .map((snap) => ({
      expenseId: snap.expenseId || snap.id,
      name: snap.name || 'Expense',
      amountPaise: expenseFromFundPaise(snap),
    }))
    .filter((line) => line.expenseId && line.amountPaise > 0)
}

export function splitExpense(expense) {
  const mode = expense.splitMode || FINANCE_SPLIT_MODES.EQUAL
  const included = expense.includedUserIds || []
  const billablePaise = expenseBillablePaise(expense)
  if (mode === FINANCE_SPLIT_MODES.SHARES) {
    const weights = {}
    for (const id of included) {
      const w = Number(expense.shares?.[id])
      weights[id] = Number.isFinite(w) && w > 0 ? w : 1
    }
    return splitByShares(billablePaise, weights)
  }
  if (mode === FINANCE_SPLIT_MODES.MANUAL) {
    const amounts = {}
    for (const id of included) {
      amounts[id] = expense.manualPaise?.[id] ?? 0
    }
    return splitManual(billablePaise, amounts)
  }
  return splitEqual(billablePaise, included)
}

/**
 * Merge several expenses into per-person exact shares plus a breakdown.
 */
export function combineExpenseShares(expenses) {
  const byUser = new Map()
  for (const expense of expenses || []) {
    const shares = splitExpense(expense)
    for (const [userId, sharePaise] of Object.entries(shares)) {
      if (!byUser.has(userId)) {
        byUser.set(userId, { userId, exactSharePaise: 0, breakdown: [] })
      }
      const row = byUser.get(userId)
      row.exactSharePaise += sharePaise
      row.breakdown.push({
        expenseId: expense.id,
        name: expense.name,
        sharePaise,
      })
    }
  }
  return [...byUser.values()].sort((a, b) => a.userId.localeCompare(b.userId))
}

export function buildExpenseSnapshot(expense, allUserIds = []) {
  const includedUserIds = [...(expense.includedUserIds || [])]
  const includedSet = new Set(includedUserIds)
  const excludedUserIds = (allUserIds || []).filter((id) => id && !includedSet.has(id))
  return {
    expenseId: expense.id,
    name: expense.name,
    amountPaise: expenseGrossPaise(expense),
    fromFundPaise: expenseFromFundPaise(expense),
    date: expense.date ?? null,
    periodId: expense.periodId ?? '',
    note: expense.note || '',
    splitMode: expense.splitMode || FINANCE_SPLIT_MODES.EQUAL,
    includedUserIds,
    excludedUserIds,
    perUserPaise: splitExpense(expense),
    cookLeave: expense.cookLeave ?? null,
  }
}

/**
 * roundRule: { mode: 'exact' | 'step', stepPaise, direction: 'up' | 'down' | 'nearest' }
 * Optional per-person override: roundRule.overrides[userId] = paise
 */
export function applyRounding(exactPaise, roundRule = { mode: 'exact' }) {
  const exact = Math.max(0, asIntPaise(exactPaise))
  if (!roundRule || roundRule.mode === 'exact') {
    return { roundedDuePaise: exact, roundingDeltaPaise: 0 }
  }
  const step = Math.max(1, asIntPaise(roundRule.stepPaise || 100))
  const direction = roundRule.direction || 'up'
  let rounded
  if (direction === 'down') {
    rounded = Math.floor(exact / step) * step
  } else if (direction === 'nearest') {
    rounded = Math.round(exact / step) * step
  } else {
    rounded = Math.ceil(exact / step) * step
  }
  rounded = Math.max(0, rounded)
  return {
    roundedDuePaise: rounded,
    roundingDeltaPaise: rounded - exact,
  }
}

export function buildCollectionPreview(
  expenses,
  roundRule,
  overrides = {},
  { allUserIds } = {},
) {
  const people = combineExpenseShares(expenses)
  const dues = people.map((row) => {
    const override = overrides[row.userId]
    const rounded =
      override !== undefined && Number.isFinite(Number(override))
        ? {
            roundedDuePaise: Math.max(0, asIntPaise(override)),
            roundingDeltaPaise:
              Math.max(0, asIntPaise(override)) - row.exactSharePaise,
          }
        : applyRounding(row.exactSharePaise, roundRule)
    return {
      ...row,
      ...rounded,
    }
  })
  const totalExpensePaise = (expenses || []).reduce(
    (s, e) => s + expenseGrossPaise(e),
    0,
  )
  const totalExactPaise = dues.reduce((s, d) => s + d.exactSharePaise, 0)
  const totalDuePaise = dues.reduce((s, d) => s + d.roundedDuePaise, 0)
  const fundImpactPaise = dues.reduce((s, d) => s + d.roundingDeltaPaise, 0)
  const fromFundPaise = (expenses || []).reduce(
    (sum, expense) => sum + expenseFromFundPaise(expense),
    0,
  )
  const knownIds =
    allUserIds?.length > 0
      ? allUserIds
      : [...new Set((expenses || []).flatMap((e) => e.includedUserIds || []))]
  return {
    dues,
    expenseSnapshots: (expenses || []).map((expense) =>
      buildExpenseSnapshot(expense, knownIds),
    ),
    totalExpensePaise,
    totalExactPaise,
    totalDuePaise,
    fundImpactPaise,
    fromFundPaise,
    cookLeaveFundPaise: (expenses || []).reduce((sum, expense) => {
      const toFund = expense?.cookLeave?.enabled
        ? Math.max(0, Math.round(Number(expense.cookLeave.toFundPaise) || 0))
        : 0
      return sum + toFund
    }, 0),
    personCount: dues.length,
  }
}
