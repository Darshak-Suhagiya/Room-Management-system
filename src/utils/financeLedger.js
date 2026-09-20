import {
  COLLECTION_STATUS,
  DUE_STATUS,
  PAYMENT_SOURCES,
  WALLET_MOVEMENT_REASONS,
} from '../config/constants'
import { buildPersonNameMap, displayName, financePersonName } from './financePeople'
import { formatCookLeaveDate, leavePeriodLine } from './cookLeave'
import { expenseBillablePaise, expenseFromFundPaise, fromFundPaiseFromSnapshots } from './financeSplit'
import { sumPaise } from './money'

export function isVoidedPayment(payment) {
  return payment?.voided === true
}

export function activePayments(payments) {
  return (payments || []).filter((p) => !isVoidedPayment(p))
}

export function paymentsForDue(payments, dueId) {
  return activePayments(payments).filter((p) => p.dueId === dueId)
}

export function paidPaiseForDue(payments, dueId) {
  return sumPaise(paymentsForDue(payments, dueId).map((p) => p.amountPaise))
}

export function isRoomFundPayment(payment) {
  return payment?.source === PAYMENT_SOURCES.ROOM_FUND
}

export function isExpenseFromFundPayment(payment) {
  if (!payment || payment.source !== PAYMENT_SOURCES.ROOM_FUND) return false
  if (payment.kind === 'from_fund') return true
  if (payment.dueId) return false
  return Boolean(payment.expenseId)
}

export function memberPaidPaiseForDue(payments, dueId) {
  return sumPaise(
    paymentsForDue(payments, dueId)
      .filter((p) => !isRoomFundPayment(p))
      .map((p) => p.amountPaise),
  )
}

export function fundPaidPaiseForDue(payments, dueId) {
  return sumPaise(
    paymentsForDue(payments, dueId)
      .filter((p) => isRoomFundPayment(p))
      .map((p) => p.amountPaise),
  )
}

export function arrearsRolledInPaise(due) {
  return Math.max(0, -carryInPaiseFor(due))
}

export function shareDuePaiseFor(due) {
  return Math.max(0, payablePaiseFor(due) - arrearsRolledInPaise(due))
}

export function fundRecoverPaiseFor(due, payments) {
  if (!due || isDueWaived(due)) return 0
  return Math.min(memberPaidPaiseForDue(payments, due.id), arrearsRolledInPaise(due))
}

export function fundCoverPaiseFor(due, payments) {
  if (!due || isDueWaived(due)) return 0
  const recover = fundRecoverPaiseFor(due, payments)
  const towardShare = Math.max(0, memberPaidPaiseForDue(payments, due.id) - recover)
  return Math.max(0, shareDuePaiseFor(due) - towardShare - fundPaidPaiseForDue(payments, due.id))
}

export function isDueWaived(due) {
  return due?.waived === true || due?.status === DUE_STATUS.WAIVED
}

export function isCollectionOpen(collection) {
  return collection?.status === COLLECTION_STATUS.ISSUED
}

export function isCollectionClosed(collection) {
  return collection?.status === COLLECTION_STATUS.CLOSED
}

export function carryInPaiseFor(due) {
  return Number(due?.carryInPaise) || 0
}

export function carryInAppliedPaise(walletBalancePaise, roundedDuePaise) {
  const wallet = Number(walletBalancePaise) || 0
  const due = Math.max(0, Number(roundedDuePaise) || 0)
  if (wallet < 0) return wallet
  return Math.min(wallet, due)
}

export function payablePaiseFor(due) {
  if (due?.payablePaise != null && Number.isFinite(Number(due.payablePaise))) {
    return Math.max(0, Number(due.payablePaise))
  }
  return Math.max(0, (due?.roundedDuePaise || 0) - carryInPaiseFor(due))
}

export function billedPaiseForWallet(due, payments) {
  if (!due) return 0
  if (isDueWaived(due)) return paidPaiseForDue(payments, due.id)
  return payablePaiseFor(due)
}

export function outstandingFor(due, payments) {
  if (!due || isDueWaived(due)) return 0
  return Math.max(0, payablePaiseFor(due) - paidPaiseForDue(payments, due.id))
}

export function leftoverPaiseFor(due, payments) {
  if (!due || isDueWaived(due)) return 0
  return Math.max(0, paidPaiseForDue(payments, due.id) - payablePaiseFor(due))
}

export function memberFullyPaidDue(due, payments, memberPaidPaise) {
  const paid =
    memberPaidPaise != null
      ? Number(memberPaidPaise) || 0
      : memberPaidPaiseForDue(payments, due?.id)
  return paid >= payablePaiseFor(due)
}

export function dueStatusFor(due, payments) {
  if (isDueWaived(due)) return DUE_STATUS.WAIVED
  const memberPaid = memberPaidPaiseForDue(payments, due.id)
  const fundPaid = fundPaidPaiseForDue(payments, due.id)
  const billed = payablePaiseFor(due)
  if (billed <= 0) return DUE_STATUS.PAID
  if (memberPaid + fundPaid <= 0) return DUE_STATUS.UNPAID
  if (memberPaid >= billed) return DUE_STATUS.PAID
  if (memberPaid + fundPaid >= billed) return DUE_STATUS.COVERED
  return DUE_STATUS.PARTIAL
}

export function enrichDue(due, payments) {
  const paidPaise = paidPaiseForDue(payments, due.id)
  const payablePaise = payablePaiseFor(due)
  const leftoverPaise = leftoverPaiseFor(due, payments)
  const memberPaidPaise = memberPaidPaiseForDue(payments, due.id)
  const fundPaidPaise = fundPaidPaiseForDue(payments, due.id)
  return {
    ...due,
    carryInPaise: carryInPaiseFor(due),
    payablePaise,
    paidPaise,
    memberPaidPaise,
    fundPaidPaise,
    outstandingPaise: outstandingFor(due, payments),
    leftoverPaise,
    overpaidPaise: leftoverPaise,
    fundCoverPaise: fundCoverPaiseFor(due, payments),
    fundRecoverPaise: fundRecoverPaiseFor(due, payments),
    arrearsRolledInPaise: arrearsRolledInPaise(due),
    shareDuePaise: shareDuePaiseFor(due),
    status: dueStatusFor(due, payments),
  }
}

export function settlePaiseFor(due, payments) {
  if (!due || isDueWaived(due)) return memberPaidPaiseForDue(payments, due?.id)
  return memberPaidPaiseForDue(payments, due.id) - payablePaiseFor(due)
}

export function isBilledCollection(collection) {
  if (!collection) return false
  return (
    collection.status === COLLECTION_STATUS.ISSUED ||
    collection.status === COLLECTION_STATUS.CLOSED
  )
}

function eventTime(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return `${value}T00:00:00.000Z`
  return String(value)
}

export function buildWalletStatement({
  userId,
  userName,
  balancePaise = 0,
  movements = [],
}) {
  const lines = [...(movements || [])]
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
    .map((movement) => ({
      id: movement.id,
      type: movement.reason || 'adjust',
      at: eventTime(movement.createdAt),
      amountPaise: movement.amountPaise || 0,
      note: movement.note || '',
      reason: movement.reason,
      refType: movement.refType,
      refId: movement.refId,
      collectionTitle: movement.collectionTitle || '',
    }))
  const balance = Number(balancePaise) || 0
  return {
    userId,
    userName: userName || '',
    balancePaise: balance,
    creditPaise: Math.max(0, balance),
    arrearsPaise: Math.max(0, -balance),
    lines,
  }
}

export function walletRowsForPeople({ users = [], statementsByUser = {} }) {
  const rows = users.map((u) => {
    const statement = statementsByUser?.[u.id]
    const balancePaise = Number(statement?.balancePaise) || 0
    return {
      userId: u.id,
      userName: displayName(u),
      balancePaise,
      creditPaise: Math.max(0, balancePaise),
      arrearsPaise: Math.max(0, -balancePaise),
      status: balancePaise > 0 ? 'credit' : balancePaise < 0 ? 'owed' : 'settled',
      lines: statement?.lines || [],
    }
  })
  return rows.sort((a, b) => a.balancePaise - b.balancePaise)
}

/** @deprecated Wallet docs are the source of truth. Kept for reminder fallbacks. */
export function buildMemberStatement({
  userId,
  userName,
  collections,
  dues,
  payments,
  balancePaise,
  movements,
}) {
  if (balancePaise != null || (movements && movements.length)) {
    return buildWalletStatement({
      userId,
      userName,
      balancePaise,
      movements,
    })
  }
  const colById = new Map((collections || []).map((c) => [c.id, c]))
  let billed = 0
  let paid = 0
  for (const due of dues || []) {
    if (due.userId !== userId) continue
    const collection = colById.get(due.collectionId)
    if (!isCollectionClosed(collection)) continue
    billed += billedPaiseForWallet(due, payments)
  }
  for (const payment of activePayments(payments)) {
    if (payment.userId !== userId) continue
    const collection = colById.get(payment.collectionId)
    if (!isCollectionClosed(collection)) continue
    paid += payment.amountPaise || 0
  }
  const balance = paid - billed
  return {
    userId,
    userName: userName || '',
    balancePaise: balance,
    creditPaise: Math.max(0, balance),
    arrearsPaise: Math.max(0, -balance),
    lines: [],
  }
}

export function buildStatementsByUser({
  collections,
  dues,
  payments,
  users,
  names,
  memberWallets = [],
  memberWalletMovements = [],
}) {
  const nameMap = names || buildPersonNameMap({ users, collections, dues, payments })
  const walletByUser = new Map((memberWallets || []).map((w) => [w.userId || w.id, w]))
  const movesByUser = new Map()
  for (const movement of memberWalletMovements || []) {
    if (!movement.userId) continue
    if (!movesByUser.has(movement.userId)) movesByUser.set(movement.userId, [])
    movesByUser.get(movement.userId).push(movement)
  }
  const ids = new Set()
  for (const wallet of memberWallets || []) {
    if (wallet.userId || wallet.id) ids.add(wallet.userId || wallet.id)
  }
  for (const due of dues || []) {
    if (due.userId) ids.add(due.userId)
  }
  for (const payment of payments || []) {
    if (payment.userId) ids.add(payment.userId)
  }
  const out = {}
  for (const userId of ids) {
    const wallet = walletByUser.get(userId)
    out[userId] = buildWalletStatement({
      userId,
      userName: financePersonName(userId, { users, collections, dues, payments, names: nameMap }),
      balancePaise: wallet?.balancePaise || 0,
      movements: movesByUser.get(userId) || [],
    })
  }
  return out
}

export function collectionRowForPerson({
  due,
  payments,
  collection,
  collections,
  users,
  names,
  dues,
}) {
  const enriched = enrichDue(due, payments)
  const closed = isCollectionClosed(collection)
  const carryInPaise = enriched.carryInPaise
  const leftoverCreditPaise = closed ? 0 : enriched.leftoverPaise
  const settledPaise = closed ? settlePaiseFor(due, payments) : 0
  const toPayPaise = closed ? 0 : enriched.outstandingPaise
  return {
    ...enriched,
    userName: financePersonName(due.userId, {
      users,
      collection,
      collections,
      dues,
      payments,
      names,
      fallback: due.userName,
    }),
    previousBalancePaise: carryInPaise,
    creditPaise: Math.max(0, carryInPaise),
    arrearsPaise: Math.max(0, -carryInPaise),
    leftoverCreditPaise,
    settledPaise,
    toPayPaise,
    netPayablePaise: toPayPaise,
    memberPaidPaise: enriched.memberPaidPaise,
    fundPaidPaise: enriched.fundPaidPaise,
    fundCoverPaise: enriched.fundCoverPaise,
    fundRecoverPaise: enriched.fundRecoverPaise,
  }
}

export function reminderAmount(due, payments) {
  return outstandingFor(due, payments)
}

export function buildCollectionReport({
  collection,
  collections = [],
  dues = [],
  payments = [],
  users = [],
  walletMovements = [],
  names,
}) {
  const nameMap =
    names ||
    buildPersonNameMap({
      users,
      collections: collection ? [collection, ...collections] : collections,
      dues,
      payments,
    })
  const people = (dues || [])
    .map((due) =>
      collectionRowForPerson({
        due,
        payments,
        collection,
        collections,
        users,
        names: nameMap,
        dues,
      }),
    )
    .sort((a, b) => a.userName.localeCompare(b.userName))

  const collectedPaise = sumPaise(
    people.map((row) => Math.min(row.paidPaise || 0, row.roundedDuePaise || 0)),
  )
  const receivedPaise = sumPaise(activePayments(payments).map((p) => p.amountPaise))
  const memberReceivedPaise = sumPaise(people.map((row) => row.memberPaidPaise || 0))
  const outstandingPaise = sumPaise(people.map((row) => row.outstandingPaise || 0))
  const fundCoveredPaise = sumPaise(people.map((row) => row.fundPaidPaise || 0))
  const fundRecoveredPaise = sumPaise(people.map((row) => row.fundRecoverPaise || 0))
  const derivedExactPaise = sumPaise(people.map((row) => row.exactSharePaise || 0))
  const derivedDuePaise = sumPaise(people.map((row) => row.roundedDuePaise || 0))
  const derivedRoundingPaise = sumPaise(people.map((row) => row.roundingDeltaPaise || 0))
  const extraCreditPaise = sumPaise(people.map((row) => row.leftoverCreditPaise || 0))
  const paidRoundingPaise = sumPaise(
    people
      .filter(
        (row) =>
          row.status !== 'waived' && (row.paidPaise || 0) >= (row.payablePaise || 0),
      )
      .map((row) => row.roundingDeltaPaise || 0),
  )

  const snapshots = collection?.expenseSnapshots || []
  const expenses = snapshots.map((snap) => ({
    ...snap,
    fromFundPaise: expenseFromFundPaise(snap),
    billablePaise: expenseBillablePaise(snap),
    includedNames: (snap.includedUserIds || []).map((id) =>
      financePersonName(id, { users, collection, collections, dues, payments, names: nameMap }),
    ),
    excludedNames: (snap.excludedUserIds || []).map((id) =>
      financePersonName(id, { users, collection, collections, dues, payments, names: nameMap }),
    ),
    perUser: Object.entries(snap.perUserPaise || {}).map(([userId, sharePaise]) => ({
      userId,
      name: financePersonName(userId, { users, collection, collections, dues, payments, names: nameMap }),
      sharePaise,
    })),
  }))

  const cookLeaves = expenses
    .filter((expense) => expense.cookLeave?.enabled)
    .map((expense) => {
      const cookLeave = expense.cookLeave
      const cookName =
        cookLeave.cookName ||
        financePersonName(cookLeave.cookUserId, {
          users,
          collection,
          collections,
          dues,
          payments,
          names: nameMap,
          fallback: 'Cook',
        })
      return {
        ...cookLeave,
        expenseId: expense.expenseId,
        expenseName: expense.name,
        cookName,
        leaveLines: (cookLeave.leaveEntries || []).map((entry) => ({
          ...entry,
          label: `${formatCookLeaveDate(entry.date)} — ${leavePeriodLine(entry.period)}`,
        })),
        perUser: expense.perUser,
        amountPaise: expense.amountPaise,
      }
    })
  const cookLeaveDeductionPaise = sumPaise(cookLeaves.map((row) => row.deductionPaise || 0))
  const cookLeaveToFundPaise = sumPaise(cookLeaves.map((row) => row.toFundPaise || 0))
  const cookLeaveBillReductionPaise = sumPaise(
    cookLeaves.map((row) => row.billReductionPaise || 0),
  )

  const fromFundPaise =
    collection?.fromFundPaise ||
    fromFundPaiseFromSnapshots(snapshots) ||
    sumPaise(
      activePayments(payments)
        .filter((payment) => isExpenseFromFundPayment(payment))
        .map((payment) => payment.amountPaise),
    )

  const dueById = new Map((dues || []).map((due) => [due.id, due]))
  const peopleByUserId = new Map(people.map((row) => [row.userId, row]))
  const fundMovements = (walletMovements || [])
    .filter((movement) => {
      if (
        (movement.reason === WALLET_MOVEMENT_REASONS.COOK_LEAVE ||
          movement.reason === WALLET_MOVEMENT_REASONS.FROM_FUND) &&
        movement.refType === 'financeCollection' &&
        movement.refId === collection?.id
      ) {
        return true
      }
      return movement.refType === 'financeDue' && dueById.has(movement.refId)
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((movement) => {
      const due = dueById.get(movement.refId)
      const person = due ? peopleByUserId.get(due.userId) : null
      return {
        ...movement,
        userName: movement.userName || person?.userName || due?.userName || '',
      }
    })
  const netByDue = new Map()
  for (const movement of fundMovements) {
    netByDue.set(
      movement.refId,
      (netByDue.get(movement.refId) || 0) + (movement.amountPaise || 0),
    )
  }
  const visibleFundMovements = fundMovements.filter((movement) => {
    if (
      movement.reason === WALLET_MOVEMENT_REASONS.COVER ||
      movement.reason === WALLET_MOVEMENT_REASONS.RECOVER ||
      movement.reason === WALLET_MOVEMENT_REASONS.COOK_LEAVE ||
      movement.reason === WALLET_MOVEMENT_REASONS.FROM_FUND
    ) {
      return (movement.amountPaise || 0) !== 0
    }
    return (netByDue.get(movement.refId) || 0) !== 0
  })
  const fundMovement = visibleFundMovements[0] || null
  const roundingMoves = fundMovements.filter(
    (movement) => movement.reason === WALLET_MOVEMENT_REASONS.ROUNDING,
  )
  const appliedFromMoves = sumPaise(roundingMoves.map((movement) => movement.amountPaise))
  const appliedFundPaise = roundingMoves.length ? appliedFromMoves : paidRoundingPaise

  const peopleIds = new Set(people.map((row) => row.userId))
  const previousIssuedAt = previousCollectionIssuedAt(collections, collection)
  const thisIssuedAt = collection?.issuedAt || ''
  const walletRepayments = (walletMovements || [])
    .filter((movement) => {
      if (movement.reason !== WALLET_MOVEMENT_REASONS.REPAY) return false
      if (movement.userId && !peopleIds.has(movement.userId)) return false
      const at = String(movement.createdAt || movement.occurredOn || '')
      if (previousIssuedAt && at && at < String(previousIssuedAt)) return false
      if (thisIssuedAt && at && at >= String(thisIssuedAt)) return false
      return true
    })
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((movement) => ({
      ...movement,
      userName:
        movement.userName ||
        peopleByUserId.get(movement.userId)?.userName ||
        financePersonName(movement.userId, {
          users,
          collection,
          collections,
          dues,
          payments,
          names: nameMap,
        }),
    }))

  const paymentLog = [...(payments || [])]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((payment) => ({
      ...payment,
      userName: isExpenseFromFundPayment(payment)
        ? 'Room fund'
        : financePersonName(payment.userId, {
            users,
            collection,
            collections,
            dues,
            payments,
            names: nameMap,
            fallback: payment.userName,
          }),
    }))

  return {
    collection,
    expenses,
    cookLeaves,
    people,
    payments: paymentLog,
    fundMovement,
    fundMovements: visibleFundMovements,
    walletRepayments,
    totals: {
      totalExpensePaise: collection?.totalExpensePaise || derivedExactPaise,
      totalExactPaise: collection?.totalExactPaise || derivedExactPaise,
      totalDuePaise: collection?.totalDuePaise || derivedDuePaise,
      fundImpactPaise: collection?.fundImpactPaise || derivedRoundingPaise,
      appliedFundPaise,
      paidRoundingPaise,
      extraCreditPaise,
      collectedPaise,
      receivedPaise,
      memberReceivedPaise,
      fundCoveredPaise,
      fundRecoveredPaise,
      cookLeaveDeductionPaise,
      cookLeaveToFundPaise,
      cookLeaveBillReductionPaise,
      fromFundPaise,
      outstandingPaise,
      personCount: people.length,
    },
  }
}

function previousCollectionIssuedAt(collections, collection) {
  if (!collection?.issuedAt) return null
  const earlier = (collections || [])
    .filter((item) => item?.id && item.id !== collection.id && item.issuedAt)
    .filter((item) => String(item.issuedAt) < String(collection.issuedAt))
    .sort((a, b) => String(a.issuedAt).localeCompare(String(b.issuedAt)))
  return earlier.at(-1)?.issuedAt || null
}

export function collectionMonthIds(collection) {
  const ids = new Set()
  if (collection?.periodId) ids.add(collection.periodId)
  for (const id of collection?.periodIds || []) {
    if (id) ids.add(id)
  }
  return ids
}

export function roomFundExpensesForCollection(walletMovements, collection) {
  const months = collectionMonthIds(collection)
  if (months.size === 0) return []
  return (walletMovements || [])
    .filter((movement) => {
      if (movement.reason !== WALLET_MOVEMENT_REASONS.EXPENSE) return false
      const period = String(movement.occurredOn || movement.createdAt || '').slice(0, 7)
      return months.has(period)
    })
    .sort((a, b) => {
      const da = a.occurredOn || String(a.createdAt || '').slice(0, 10)
      const db = b.occurredOn || String(b.createdAt || '').slice(0, 10)
      return String(db).localeCompare(String(da))
    })
}
