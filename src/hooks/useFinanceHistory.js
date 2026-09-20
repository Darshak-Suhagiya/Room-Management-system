import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { listCollectionsPage, listDuesForCollections } from '../services/financeCollectionService'
import { listPaymentsForCollections } from '../services/financePaymentService'
import { listExpensesPage } from '../services/expenseService'
import { listWalletMovementsPage } from '../services/roomWalletService'
import { buildPersonNameMap } from '../utils/financePeople'
import { buildCollectionReport, enrichDue } from '../utils/financeLedger'

const COLLECTION_PAGE = 10
const EXPENSE_PAGE = 20
const MOVEMENT_PAGE = 20

function mergeById(existing, incoming) {
  const map = new Map((existing || []).map((item) => [item.id, item]))
  for (const item of incoming || []) {
    if (item?.id) map.set(item.id, item)
  }
  return [...map.values()]
}

export function useFinanceHistory({
  enabled = true,
  users = [],
} = {}) {
  const [collections, setCollections] = useState([])
  const [expenses, setExpenses] = useState([])
  const [walletMovements, setWalletMovements] = useState([])
  const [dues, setDues] = useState([])
  const [payments, setPayments] = useState([])
  const [error, setError] = useState('')

  const [loadingCollections, setLoadingCollections] = useState(true)
  const [loadingExpenses, setLoadingExpenses] = useState(true)
  const [loadingMovements, setLoadingMovements] = useState(true)
  const [loadingMoreCollections, setLoadingMoreCollections] = useState(false)
  const [loadingMoreExpenses, setLoadingMoreExpenses] = useState(false)
  const [loadingMoreMovements, setLoadingMoreMovements] = useState(false)
  const [hasMoreCollections, setHasMoreCollections] = useState(false)
  const [hasMoreExpenses, setHasMoreExpenses] = useState(false)
  const [hasMoreMovements, setHasMoreMovements] = useState(false)

  const collectionCursor = useRef(null)
  const expenseCursor = useRef(null)
  const movementCursor = useRef(null)
  const collectionsRef = useRef([])

  const loadCollectionPage = useCallback(async (reset) => {
    const page = await listCollectionsPage({
      max: COLLECTION_PAGE,
      cursor: reset ? null : collectionCursor.current,
    })
    collectionCursor.current = page.cursor
    setHasMoreCollections(page.hasMore)
    setCollections((prev) => (reset ? page.items : mergeById(prev, page.items)))
    collectionsRef.current = reset
      ? page.items
      : mergeById(collectionsRef.current, page.items)
    const nextDues = await listDuesForCollections(page.items.map((item) => item.id))
    const nextPayments = await listPaymentsForCollections(page.items.map((item) => item.id))
    setDues((prev) => (reset ? nextDues : mergeById(prev, nextDues)))
    setPayments((prev) => (reset ? nextPayments : mergeById(prev, nextPayments)))
  }, [])

  const loadExpensePage = useCallback(async (reset) => {
    const page = await listExpensesPage({
      max: EXPENSE_PAGE,
      cursor: reset ? null : expenseCursor.current,
    })
    expenseCursor.current = page.cursor
    setHasMoreExpenses(page.hasMore)
    setExpenses((prev) => (reset ? page.items : mergeById(prev, page.items)))
  }, [])

  const loadMovementPage = useCallback(async (reset) => {
    const page = await listWalletMovementsPage({
      max: MOVEMENT_PAGE,
      cursor: reset ? null : movementCursor.current,
    })
    movementCursor.current = page.cursor
    setHasMoreMovements(page.hasMore)
    setWalletMovements((prev) => (reset ? page.items : mergeById(prev, page.items)))
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    void Promise.all([
      loadCollectionPage(true),
      loadExpensePage(true),
      loadMovementPage(true),
    ])
      .then(() => {
        if (!cancelled) setError('')
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) setError(err.message || 'Could not load history.')
      })
      .finally(() => {
        if (cancelled) return
        setLoadingCollections(false)
        setLoadingExpenses(false)
        setLoadingMovements(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled, loadCollectionPage, loadExpensePage, loadMovementPage])

  const loadMoreCollections = useCallback(async () => {
    if (!hasMoreCollections || loadingMoreCollections) return
    setLoadingMoreCollections(true)
    try {
      await loadCollectionPage(false)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not load more collections.')
    } finally {
      setLoadingMoreCollections(false)
    }
  }, [hasMoreCollections, loadCollectionPage, loadingMoreCollections])

  const loadMoreExpenses = useCallback(async () => {
    if (!hasMoreExpenses || loadingMoreExpenses) return
    setLoadingMoreExpenses(true)
    try {
      await loadExpensePage(false)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not load more expenses.')
    } finally {
      setLoadingMoreExpenses(false)
    }
  }, [hasMoreExpenses, loadExpensePage, loadingMoreExpenses])

  const loadMoreMovements = useCallback(async () => {
    if (!hasMoreMovements || loadingMoreMovements) return
    setLoadingMoreMovements(true)
    try {
      await loadMovementPage(false)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not load more fund movements.')
    } finally {
      setLoadingMoreMovements(false)
    }
  }, [hasMoreMovements, loadMovementPage, loadingMoreMovements])

  const refresh = useCallback(async () => {
    const ids = collectionsRef.current.map((item) => item.id)
    const [nextDues, nextPayments] = await Promise.all([
      listDuesForCollections(ids),
      listPaymentsForCollections(ids),
    ])
    setDues(nextDues)
    setPayments(nextPayments)
  }, [])

  const personNames = useMemo(
    () =>
      buildPersonNameMap({
        users,
        collections,
        dues,
        payments,
      }),
    [users, collections, dues, payments],
  )

  const duesByCollection = useMemo(() => {
    const grouped = {}
    for (const due of dues) {
      const cid = due.collectionId
      if (!grouped[cid]) grouped[cid] = []
      grouped[cid].push(due)
    }
    for (const [cid, list] of Object.entries(grouped)) {
      const colPayments = payments.filter((p) => p.collectionId === cid)
      grouped[cid] = list.map((d) => enrichDue(d, colPayments))
    }
    return grouped
  }, [dues, payments])

  const paymentsByCollection = useMemo(() => {
    const grouped = {}
    for (const payment of payments) {
      const cid = payment.collectionId
      if (!grouped[cid]) grouped[cid] = []
      grouped[cid].push(payment)
    }
    return grouped
  }, [payments])

  const reportByCollection = useMemo(() => {
    const out = {}
    for (const col of collections) {
      out[col.id] = buildCollectionReport({
        collection: col,
        collections,
        dues: dues.filter((d) => d.collectionId === col.id),
        payments: paymentsByCollection[col.id] || [],
        users,
        walletMovements,
        names: personNames,
      })
    }
    return out
  }, [
    collections,
    dues,
    paymentsByCollection,
    users,
    walletMovements,
    personNames,
  ])

  return {
    collections,
    expenses,
    walletMovements,
    duesByCollection,
    paymentsByCollection,
    reportByCollection,
    error,
    loadingCollections,
    loadingExpenses,
    loadingMovements,
    loadingMoreCollections,
    loadingMoreExpenses,
    loadingMoreMovements,
    hasMoreCollections,
    hasMoreExpenses,
    hasMoreMovements,
    loadMoreCollections,
    loadMoreExpenses,
    loadMoreMovements,
    refresh,
  }
}
