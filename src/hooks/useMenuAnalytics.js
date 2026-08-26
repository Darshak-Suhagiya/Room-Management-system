import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMenuCatalog } from './useMenuCatalog'
import { useRegisterPullToRefresh } from './useRegisterPullToRefresh'
import { getAllPlannedMenus } from '../services/menuService'
import { getAllParticipations } from '../services/participationService'
import {
  ANALYTICS_RANGE_PRESETS,
  buildCookCounts,
  buildItemAnalyticsRows,
  buildReviewSentimentByItem,
  countMealSlotsInRange,
  getItemCookHistory,
  resolveAnalyticsRange,
} from '../utils/menuReviewUtils'

export const MIN_REVIEWS_FOR_BEST = 3

export const ANALYTICS_PRESET_OPTIONS = [
  { id: ANALYTICS_RANGE_PRESETS.ALL, label: 'All time' },
  { id: ANALYTICS_RANGE_PRESETS.LAST_30, label: 'Last 30 days' },
  { id: ANALYTICS_RANGE_PRESETS.LAST_90, label: 'Last 90 days' },
  { id: ANALYTICS_RANGE_PRESETS.CUSTOM, label: 'Custom' },
]

export function getAnalyticsPresetLabel(preset) {
  return (
    ANALYTICS_PRESET_OPTIONS.find((opt) => opt.id === preset)?.label ?? 'Last 30 days'
  )
}

export function useMenuAnalytics() {
  const {
    catalog,
    loading: catalogLoading,
    categoryIds,
    error: catalogError,
  } = useMenuCatalog()

  const [menus, setMenus] = useState([])
  const [participations, setParticipations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [preset, setPreset] = useState(ANALYTICS_RANGE_PRESETS.LAST_30)
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('timesMade')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedId, setSelectedId] = useState(null)
  const [historyMode, setHistoryMode] = useState('range')

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!categoryIds?.length) {
      setMenus([])
      setParticipations([])
      if (!silent) setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    setError('')
    try {
      const [menuList, parts] = await Promise.all([
        getAllPlannedMenus(categoryIds),
        getAllParticipations(),
      ])
      setMenus(menuList)
      setParticipations(parts)
    } catch (err) {
      setError(err.message || 'Failed to load analytics data.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [categoryIds])

  useRegisterPullToRefresh(async () => {
    await load({ silent: true })
  })

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (!cancelled) load()
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [load])

  const { fromDateId, toDateId } = useMemo(
    () => resolveAnalyticsRange(preset, customFrom, customTo, menus),
    [preset, customFrom, customTo, menus],
  )

  const cookCounts = useMemo(
    () => buildCookCounts(menus, fromDateId, toDateId),
    [menus, fromDateId, toDateId],
  )

  const sentimentByItem = useMemo(
    () => buildReviewSentimentByItem(participations, fromDateId, toDateId),
    [participations, fromDateId, toDateId],
  )

  const rows = useMemo(
    () => buildItemAnalyticsRows(catalog, cookCounts, sentimentByItem),
    [catalog, cookCounts, sentimentByItem],
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows
    if (categoryFilter !== 'all') {
      list = list.filter((r) => r.categoryId === categoryFilter)
    }
    if (q) {
      list = list.filter(
        (r) =>
          r.gu.toLowerCase().includes(q) ||
          r.en.toLowerCase().includes(q) ||
          r.categoryLabel.toLowerCase().includes(q),
      )
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'string') return av.localeCompare(bv) * dir
      return ((av ?? 0) - (bv ?? 0)) * dir
    })
  }, [rows, categoryFilter, search, sortKey, sortDir])

  const overview = useMemo(() => {
    const slots = countMealSlotsInRange(menus, fromDateId, toDateId)
    let uniqueCooked = 0
    let totalReviews = 0
    let good = 0
    let okay = 0
    let bad = 0
    for (const r of rows) {
      if (r.timesMade > 0) uniqueCooked += 1
      totalReviews += r.totalReviews
      good += r.good
      okay += r.okay
      bad += r.bad
    }
    return { slots, uniqueCooked, totalReviews, good, okay, bad }
  }, [menus, fromDateId, toDateId, rows])

  const topCookedChart = useMemo(() => {
    return [...rows]
      .filter((r) => r.timesMade > 0)
      .sort((a, b) => b.timesMade - a.timesMade)
      .slice(0, 8)
      .map((r) => ({
        name: r.gu.length > 14 ? `${r.gu.slice(0, 12)}…` : r.gu,
        fullName: r.gu,
        count: r.timesMade,
      }))
  }, [rows])

  const topCookedRows = useMemo(() => {
    return [...rows]
      .filter((r) => r.timesMade > 0)
      .sort((a, b) => b.timesMade - a.timesMade)
      .slice(0, 8)
  }, [rows])

  const ratingMixChart = useMemo(
    () => [
      { name: 'Good', key: 'good', value: overview.good },
      { name: 'Okay', key: 'okay', value: overview.okay },
      { name: 'Bad', key: 'bad', value: overview.bad },
    ],
    [overview],
  )

  const insights = useMemo(() => {
    const neverCooked = rows
      .filter((r) => r.timesMade === 0)
      .sort((a, b) => a.gu.localeCompare(b.gu))
      .slice(0, 12)

    const bestRated = [...rows]
      .filter((r) => r.totalReviews >= MIN_REVIEWS_FOR_BEST)
      .sort((a, b) => b.net - a.net || b.good - a.good)
      .slice(0, 8)

    const needsAttention = [...rows]
      .filter((r) => r.bad > 0 || r.net < 0)
      .sort((a, b) => b.bad - a.bad || a.net - b.net)
      .slice(0, 8)

    return { neverCooked, bestRated, needsAttention }
  }, [rows])

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const selectedHistory = useMemo(() => {
    if (!selectedId) return []
    if (historyMode === 'last5') {
      return getItemCookHistory(selectedId, menus, participations, 5)
    }
    return getItemCookHistory(selectedId, menus, participations, null, {
      fromDateId,
      toDateId,
    })
  }, [
    selectedId,
    historyMode,
    menus,
    participations,
    fromDateId,
    toDateId,
  ])

  const getHistoryForItem = useCallback(
    (itemId) => {
      if (!itemId) return []
      if (historyMode === 'last5') {
        return getItemCookHistory(itemId, menus, participations, 5)
      }
      return getItemCookHistory(itemId, menus, participations, null, {
        fromDateId,
        toDateId,
      })
    },
    [historyMode, menus, participations, fromDateId, toDateId],
  )

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'gu' || key === 'categoryLabel' ? 'asc' : 'desc')
    }
  }

  const sortMark = (key) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  const categoryFilterLabel = useMemo(() => {
    if (categoryFilter === 'all') return 'All categories'
    const cat = (catalog.categories ?? []).find((c) => c.id === categoryFilter)
    return cat?.labelGu || cat?.labelEn || categoryFilter
  }, [catalog.categories, categoryFilter])

  return {
    catalog,
    catalogLoading,
    catalogError,
    loading,
    error,
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    categoryFilter,
    setCategoryFilter,
    categoryFilterLabel,
    search,
    setSearch,
    sortKey,
    setSortKey,
    sortDir,
    setSortDir,
    selectedId,
    setSelectedId,
    historyMode,
    setHistoryMode,
    fromDateId,
    toDateId,
    rows,
    filteredRows,
    overview,
    topCookedChart,
    topCookedRows,
    ratingMixChart,
    insights,
    selectedRow,
    selectedHistory,
    getHistoryForItem,
    toggleSort,
    sortMark,
  }
}
