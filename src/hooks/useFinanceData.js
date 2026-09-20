import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAllUsers } from '../services/userService'
import { getFinanceSettings } from '../services/financeSettingsService'
import {
  getDepositAccount,
  listDepositAccounts,
  listDepositMovements,
} from '../services/depositService'
import { listExpenseTemplates, listDraftExpenses, listExpenses } from '../services/expenseService'
import {
  listCollectionsByIds,
  listCollectionsWindow,
  listDuesForCollections,
  listDuesForUser,
} from '../services/financeCollectionService'
import { listPaymentsForCollections, listPaymentsForUser } from '../services/financePaymentService'
import { getRoomWallet, listWalletMovements } from '../services/roomWalletService'
import {
  listAllMemberWalletMovements,
  listMemberWalletMovements,
  listMemberWallets,
} from '../services/memberWalletService'
import { countPendingFundFixes } from '../services/financeFundRepairService'
import {
  listPendingWalletRepayments,
  listWalletRepaymentsForUser,
} from '../services/financeWalletRepaymentService'
import { currentPeriodId } from '../utils/money'
import { COLLECTION_STATUS, EXPENSE_STATUS } from '../config/constants'
import { isSelectableFinanceUser, buildPersonNameMap } from '../utils/financePeople'
import {
  buildCollectionReport,
  buildStatementsByUser,
  enrichDue,
} from '../utils/financeLedger'

const COLLECTION_WINDOW = 24
const WALLET_MOVEMENT_WINDOW = 200

function mergeById(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const item of list || []) {
      if (item?.id) map.set(item.id, item)
    }
  }
  return [...map.values()]
}

function sortExpenses(list) {
  return list.sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  )
}

export function useFinanceData({ userId, canManage, periodId: periodProp } = {}) {
  const [periodId, setPeriodId] = useState(periodProp || currentPeriodId())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState(null)
  const [users, setUsers] = useState([])
  const [deposits, setDeposits] = useState([])
  const [templates, setTemplates] = useState([])
  const [allExpenses, setAllExpenses] = useState([])
  const [allCollections, setAllCollections] = useState([])
  const [allDues, setAllDues] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [myMovements, setMyMovements] = useState([])
  const [wallet, setWallet] = useState({ balancePaise: 0 })
  const [walletMovements, setWalletMovements] = useState([])
  const [memberWallets, setMemberWallets] = useState([])
  const [memberWalletMovements, setMemberWalletMovements] = useState([])
  const [walletRepayments, setWalletRepayments] = useState([])

  const reload = useCallback(async () => {
    try {
      const [
        nextSettings,
        nextUsers,
        nextDeposits,
        nextTemplates,
        nextPeriodExpenses,
        nextDrafts,
        nextCollections,
        nextWallet,
        nextWalletMoves,
        nextMemberWallets,
        nextMemberMoves,
        nextWalletRepayments,
        myAccount,
        myDepositMoves,
        ownDues,
        ownPayments,
      ] = await Promise.all([
        getFinanceSettings(),
        listAllUsers().catch(() => []),
        canManage ? listDepositAccounts() : Promise.resolve([]),
        listExpenseTemplates(),
        listExpenses(periodId),
        listDraftExpenses(),
        listCollectionsWindow(COLLECTION_WINDOW),
        getRoomWallet(),
        listWalletMovements({ max: WALLET_MOVEMENT_WINDOW }),
        listMemberWallets(),
        canManage
          ? listAllMemberWalletMovements({ max: 200 })
          : userId
            ? listMemberWalletMovements(userId, { max: 80 })
            : Promise.resolve([]),
        canManage
          ? listPendingWalletRepayments().catch(() => [])
          : userId
            ? listWalletRepaymentsForUser(userId).catch(() => [])
            : Promise.resolve([]),
        userId ? getDepositAccount(userId) : Promise.resolve(null),
        userId ? listDepositMovements(userId) : Promise.resolve([]),
        userId ? listDuesForUser(userId) : Promise.resolve([]),
        userId ? listPaymentsForUser(userId) : Promise.resolve([]),
      ])

      const windowIds = new Set(nextCollections.map((item) => item.id))
      const extraColIds = [
        ...ownDues.map((due) => due.collectionId),
        ...ownPayments.map((payment) => payment.collectionId),
      ].filter((id) => id && !windowIds.has(id))
      const extraCols = extraColIds.length ? await listCollectionsByIds(extraColIds) : []
      const mergedCollections = mergeById(nextCollections, extraCols)
      const [windowDues, windowPayments] = await Promise.all([
        listDuesForCollections(mergedCollections.map((item) => item.id)),
        listPaymentsForCollections(mergedCollections.map((item) => item.id)),
      ])

      const financeUsers = (nextUsers || []).filter(isSelectableFinanceUser)
      setSettings(nextSettings)
      setUsers(financeUsers)
      setDeposits(
        canManage
          ? nextDeposits
          : myAccount
            ? [myAccount]
            : [],
      )
      setTemplates(nextTemplates)
      setAllExpenses(sortExpenses(mergeById(nextDrafts, nextPeriodExpenses)))
      setAllCollections(mergedCollections)
      setAllDues(mergeById(windowDues, ownDues))
      setAllPayments(mergeById(windowPayments, ownPayments))
      setWallet(nextWallet)
      setWalletMovements(nextWalletMoves)
      setMemberWallets(nextMemberWallets)
      setMemberWalletMovements(nextMemberMoves)
      setWalletRepayments(nextWalletRepayments)
      setMyMovements(myDepositMoves)
      setError('')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not load finance.')
    }
  }, [canManage, periodId, userId])

  useEffect(() => {
    let cancelled = false
    // Data fetch: state updates happen after awaited Firestore reads.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load on mount/filter change
    void reload().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [reload])

  const people = useMemo(() => {
    return users.map((u) => {
      const acc = deposits.find((d) => d.userId === u.id)
      return {
        ...u,
        deposit: acc || {
          userId: u.id,
          balancePaise: 0,
          expectedPaise: settings?.standardDepositPaise ?? 0,
          status: 'active',
        },
      }
    })
  }, [users, deposits, settings])

  const expenses = useMemo(
    () => allExpenses.filter((e) => e.periodId === periodId),
    [allExpenses, periodId],
  )

  const draftExpenses = useMemo(
    () => allExpenses.filter((e) => e.status !== EXPENSE_STATUS.ISSUED),
    [allExpenses],
  )

  const collections = useMemo(
    () => allCollections.filter((c) => c.periodId === periodId),
    [allCollections, periodId],
  )

  const personNames = useMemo(
    () =>
      buildPersonNameMap({
        users: people,
        collections: allCollections,
        dues: allDues,
        payments: allPayments,
      }),
    [people, allCollections, allDues, allPayments],
  )

  const statementsByUser = useMemo(
    () =>
      buildStatementsByUser({
        collections: allCollections,
        dues: allDues,
        payments: allPayments,
        users: people,
        names: personNames,
        memberWallets,
        memberWalletMovements,
      }),
    [allCollections, allDues, allPayments, people, personNames, memberWallets, memberWalletMovements],
  )

  const duesByCollection = useMemo(() => {
    const grouped = {}
    for (const due of allDues) {
      const cid = due.collectionId
      if (!grouped[cid]) grouped[cid] = []
      grouped[cid].push(due)
    }
    for (const [cid, list] of Object.entries(grouped)) {
      const payments = allPayments.filter((p) => p.collectionId === cid)
      grouped[cid] = list.map((d) => enrichDue(d, payments))
    }
    return grouped
  }, [allDues, allPayments])

  const paymentsByCollection = useMemo(() => {
    const grouped = {}
    for (const payment of allPayments) {
      const cid = payment.collectionId
      if (!grouped[cid]) grouped[cid] = []
      grouped[cid].push(payment)
    }
    return grouped
  }, [allPayments])

  const reportByCollection = useMemo(() => {
    const out = {}
    for (const col of allCollections) {
      out[col.id] = buildCollectionReport({
        collection: col,
        collections: allCollections,
        dues: allDues.filter((d) => d.collectionId === col.id),
        payments: paymentsByCollection[col.id] || [],
        users: people,
        walletMovements,
        names: personNames,
      })
    }
    return out
  }, [allCollections, allDues, paymentsByCollection, people, walletMovements, personNames])

  const unpaidDues = useMemo(() => {
    const openIds = new Set(
      allCollections
        .filter((c) => c.status === COLLECTION_STATUS.ISSUED)
        .map((c) => c.id),
    )
    return Object.values(duesByCollection)
      .flat()
      .filter((d) => openIds.has(d.collectionId) && (d.outstandingPaise || 0) > 0)
  }, [allCollections, duesByCollection])

  const myDues = useMemo(
    () => (userId ? allDues.filter((d) => d.userId === userId).map((d) => {
      const payments = paymentsByCollection[d.collectionId] || []
      return enrichDue(d, payments)
    }) : []),
    [allDues, paymentsByCollection, userId],
  )

  const totals = useMemo(() => {
    const depositsHeld = deposits.reduce((s, d) => s + (d.balancePaise || 0), 0)
    const issued = collections.filter((c) => c.status !== COLLECTION_STATUS.DRAFT)
    const issuedPaise = issued.reduce((s, c) => s + (c.totalDuePaise || 0), 0)
    const collectedPaise = issued.reduce((s, c) => {
      const report = reportByCollection[c.id]
      return s + (report?.totals.receivedPaise || 0)
    }, 0)
    return { depositsHeld, issuedPaise, collectedPaise }
  }, [deposits, collections, reportByCollection])

  const pendingFundFixes = useMemo(
    () => countPendingFundFixes({
      collections: allCollections,
      dues: allDues,
      payments: allPayments,
    }),
    [allCollections, allDues, allPayments],
  )

  return {
    periodId,
    setPeriodId,
    loading,
    error,
    settings,
    users: people,
    templates,
    expenses,
    draftExpenses,
    allExpenses,
    collections,
    allCollections,
    duesByCollection,
    paymentsByCollection,
    reportByCollection,
    statementsByUser,
    myDues,
    myMovements,
    deposits,
    wallet,
    walletMovements,
    memberWallets,
    memberWalletMovements,
    walletRepayments,
    unpaidDues,
    totals,
    allDues,
    allPayments,
    pendingFundFixes,
    reload,
  }
}
