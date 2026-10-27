import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useMenuCatalog } from './useMenuCatalog'
import { useDefaultsGate } from './useDefaultsGate'
import { DEFAULT_MEAL_MODE } from '../config/constants'
import { VOTE_TYPES } from '../config/voteTypes'
import { listPlannedMenusFromDate } from '../services/menuService'
import { saveMealDefaults, setDateOverrides } from '../services/mealDefaultsService'
import { formatDateId } from '../utils/mealDateUtils'
import { groupPlannedByCategory } from '../utils/groupMenuByCategory'
import {
  gateItemIdSet,
  getCatalogVoteItems,
  isDefaultVoteSet,
} from '../utils/mealDefaultsUtils'
import { getVoteValue } from '../utils/menuVoteUtils'
import { isValidQuantity } from '../utils/voteQuantityUtils'

function sameVotes(a, b, items) {
  return items.every((item) => {
    const left = getVoteValue(a, item.id)
    const right = getVoteValue(b, item.id)
    const l = left === undefined || left === null || left === '' ? null : left
    const r = right === undefined || right === null || right === '' ? null : right
    return l === r
  })
}

/** State and actions shared by the desktop and mobile Default votes screens. */
export function useDefaultVotesController() {
  const { user } = useAuth()
  const toast = useToast()
  const { catalog, loading: catalogLoading, categoryIds } = useMenuCatalog()
  const [searchParams, setSearchParams] = useSearchParams()
  const today = formatDateId(new Date())
  const categoryKey = categoryIds.join(',')

  const [menus, setMenus] = useState([])
  const [menusLoading, setMenusLoading] = useState(true)
  const { defaults, defaultsReady, gate } = useDefaultsGate({ menus, catalog })

  const [mode, setMode] = useState(DEFAULT_MEAL_MODE.NOT_EATING)
  const [votes, setVotes] = useState({})
  const [saving, setSaving] = useState(false)
  const [overrideBusy, setOverrideBusy] = useState(false)
  const [invalidIds, setInvalidIds] = useState([])
  const [filter, setFilter] = useState(
    searchParams.get('missing') === '1' ? 'missing' : 'all',
  )
  const [categoryId, setCategoryId] = useState('all')
  const [search, setSearch] = useState('')
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (catalogLoading) return undefined
    let cancelled = false
    listPlannedMenusFromDate(today, categoryIds)
      .then((data) => {
        if (!cancelled) setMenus(data)
      })
      .catch(() => {
        if (!cancelled) setMenus([])
      })
      .finally(() => {
        if (!cancelled) setMenusLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categoryKey tracks categoryIds
  }, [catalogLoading, today, categoryKey])

  const allItems = useMemo(() => getCatalogVoteItems(catalog), [catalog])

  const dirty = useMemo(() => {
    if (!defaults) return false
    if (mode !== defaults.mode) return true
    return !sameVotes(votes, defaults.votes, allItems)
  }, [defaults, mode, votes, allItems])

  // Copy saved defaults into the draft on first load, and again whenever the
  // saved copy changes while the draft is clean.
  const defaultsStamp = defaults ? `${defaults.updatedAt}|${defaults.mode}` : ''
  useEffect(() => {
    if (!defaults) return
    if (hydratedRef.current && dirty) return
    hydratedRef.current = true
    setMode(defaults.mode)
    setVotes(defaults.votes ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sync only when the saved doc changes
  }, [defaultsStamp, defaultsReady])

  const plannedDates = useMemo(
    () =>
      new Set(
        menus.filter((m) => m.hasMorning || m.hasEvening).map((m) => m.date),
      ),
    [menus],
  )

  const gateIds = useMemo(() => gateItemIdSet(gate), [gate])

  /** Dishes on open planned menus that still need a default (live with the draft). */
  const requiredMissingIds = useMemo(
    () =>
      allItems
        .filter((item) => gateIds.has(item.id) && !isDefaultVoteSet(item, votes))
        .map((item) => item.id),
    [allItems, gateIds, votes],
  )

  const missingCount = useMemo(
    () => allItems.filter((item) => !isDefaultVoteSet(item, votes)).length,
    [allItems, votes],
  )

  const categoryChips = useMemo(() => {
    const cats = catalog?.categories ?? []
    return cats
      .map((cat) => ({
        id: cat.id,
        label: cat.labelGu,
        count: allItems.filter((i) => i.categoryId === cat.id).length,
      }))
      .filter((c) => c.count > 0)
  }, [catalog, allItems])

  const grouped = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const visible = allItems.filter((item) => {
      if (categoryId !== 'all' && item.categoryId !== categoryId) return false
      if (filter === 'missing' && isDefaultVoteSet(item, votes)) return false
      if (needle) {
        const hay = `${item.gu ?? ''} ${item.en ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
    return groupPlannedByCategory(visible, catalog)
  }, [allItems, categoryId, filter, search, votes, catalog])

  const changeFilter = useCallback(
    (next) => {
      setFilter(next)
      if (searchParams.has('missing')) {
        const params = new URLSearchParams(searchParams)
        params.delete('missing')
        setSearchParams(params, { replace: true })
      }
    },
    [searchParams, setSearchParams],
  )

  const updateVote = useCallback((itemId, voteType, value) => {
    setVotes((prev) => ({ ...prev, [itemId]: { voteType, value } }))
    setInvalidIds((prev) => prev.filter((id) => id !== itemId))
  }, [])

  const reset = useCallback(() => {
    if (!defaults) return
    setMode(defaults.mode)
    setVotes(defaults.votes ?? {})
    setInvalidIds([])
  }, [defaults])

  const save = useCallback(async () => {
    if (!user?.uid || saving) return false
    const invalid = allItems
      .filter((item) => {
        if (item.voteType !== VOTE_TYPES.INTEGER) return false
        const val = getVoteValue(votes, item.id)
        if (val === undefined || val === null || val === '') return false
        return !isValidQuantity(val)
      })
      .map((item) => item.id)
    if (invalid.length > 0) {
      setInvalidIds(invalid)
      toast.error('Invalid value. Use numbers in steps of 0.5 (e.g. 1, 1.5, 2).')
      return false
    }

    const payload = {}
    for (const item of allItems) {
      const val = getVoteValue(votes, item.id)
      if (!isDefaultVoteSet(item, votes)) continue
      payload[item.id] = { voteType: item.voteType, value: val }
    }

    setSaving(true)
    try {
      await saveMealDefaults(user.uid, { mode, votes: payload })
      toast.success('Default votes saved')
      return true
    } catch (err) {
      toast.error(err.message || 'Could not save default votes.')
      return false
    } finally {
      setSaving(false)
    }
  }, [user, saving, allItems, votes, mode, toast])

  const applyOverrides = useCallback(
    async (dateIds, value) => {
      if (!user?.uid) return
      setOverrideBusy(true)
      try {
        const count = await setDateOverrides(user.uid, dateIds, value)
        const noun = count === 1 ? 'date' : 'dates'
        toast.success(
          value === null
            ? `${count} ${noun} back to default`
            : `${count} ${noun} set to ${value === DEFAULT_MEAL_MODE.EATING ? 'Eating' : 'Not eating'}`,
        )
      } catch (err) {
        toast.error(err.message || 'Could not update those dates.')
        throw err
      } finally {
        setOverrideBusy(false)
      }
    },
    [user, toast],
  )

  const overrides = defaults?.dateOverrides ?? {}
  const upcomingOverrideCount = Object.keys(overrides).filter(
    (d) => d >= today,
  ).length

  return {
    today,
    catalog,
    loading: catalogLoading || menusLoading || !defaultsReady,
    loadError: defaults?.error || '',
    mode,
    setMode,
    votes,
    updateVote,
    dirty,
    saving,
    save,
    reset,
    invalidIds,
    filter,
    changeFilter,
    categoryId,
    setCategoryId,
    categoryChips,
    search,
    setSearch,
    grouped,
    allCount: allItems.length,
    missingCount,
    gate,
    gateIds,
    requiredMissingIds,
    plannedDates,
    overrides,
    upcomingOverrideCount,
    overrideBusy,
    applyOverrides,
  }
}
