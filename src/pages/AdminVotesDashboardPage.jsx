import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MealDashboardSlotCard } from '../components/MealDashboardSlotCard'
import { MealSlotDetailModal } from '../components/MealSlotDetailModal'
import { MEAL_SLOTS } from '../config/menuItems'
import { useAuth } from '../contexts/AuthContext'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import {
  getAllPlannedMenus,
  getMenuByDate,
  setMenuTotalOverride,
} from '../services/menuService'
import { useToast } from '../contexts/ToastContext'
import { getParticipationsForSlot } from '../services/participationService'
import { listApprovedUsers } from '../services/userService'
import { setVoteLock } from '../services/voteLockService'
import {
  expandMenusToMealSlots,
  filterSlotsByDate,
  filterSlotsTodayAndTomorrow,
  formatDateId,
  formatDisplayDateGu,
  getPlannedDateIds,
  isTodayDate,
  isTomorrowDate,
  sortSlotsTodayThenTomorrow,
} from '../utils/mealDateUtils'
import { buildVoteStats, getPlannedMenuItems } from '../utils/menuVoteUtils'
import { VoteSummary } from '../components/VoteSummary'
import { MealCalendar } from '../components/MealCalendar'

const MEALS_PER_PAGE = 4

function groupSlotsByDate(slots) {
  const map = new Map()
  for (const entry of slots) {
    if (!map.has(entry.date)) {
      map.set(entry.date, { date: entry.date, slots: [] })
    }
    map.get(entry.date).slots.push(entry)
  }
  return Array.from(map.values())
}

export function AdminVotesDashboardPage() {
  const {
    user,
    isAdmin,
    isMaharaj,
    canLockVotes,
    canAdjustVoteTotals,
    showVoteCountBreakdown,
  } = useAuth()
  const toast = useToast()
  const { catalog, loading: catalogLoading, categoryIds } = useMenuCatalog({
    autoSeed: true,
  })
  const [menus, setMenus] = useState([])
  const [users, setUsers] = useState([])
  const [statsByKey, setStatsByKey] = useState({})
  const [loading, setLoading] = useState(true)
  const todayId = formatDateId(new Date())
  // Default: show today (calendar-selected custom day). Fallback to today+tomorrow
  // kept available in the Date filter dropdown.
  const [dateFilter, setDateFilter] = useState('custom')
  const [customDate, setCustomDate] = useState(todayId)
  const [slotFilter, setSlotFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [modalSlot, setModalSlot] = useState(null)
  const [busyKey, setBusyKey] = useState(null)
  const [overrideSavingId, setOverrideSavingId] = useState(null)
  const todayRef = useRef(null)
  const scrolledRef = useRef(false)
  const didInitDateRef = useRef(false)

  const loadDashboard = useCallback(async () => {
    const [menuData, userList] = await Promise.all([
      getAllPlannedMenus(categoryIds),
      listApprovedUsers(),
    ])
    setMenus(menuData)
    setUsers(userList)
  }, [categoryIds])

  useEffect(() => {
    if (catalogLoading) return

    let cancelled = false
    setLoading(true)

    loadDashboard()
      .catch((err) => {
        if (!cancelled) toast.error(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [catalogLoading, loadDashboard, toast])

  const plannedDates = useMemo(() => getPlannedDateIds(menus), [menus])
  const plannedDatesSet = useMemo(() => new Set(plannedDates), [plannedDates])

  const mealSlots = useMemo(() => {
    const expanded = expandMenusToMealSlots(menus)
    let byDate = expanded
    if (dateFilter === 'today_tomorrow') {
      byDate = sortSlotsTodayThenTomorrow(filterSlotsTodayAndTomorrow(expanded))
    } else if (dateFilter === 'custom') {
      byDate = filterSlotsByDate(expanded, customDate)
    }
    return slotFilter === 'all'
      ? byDate
      : byDate.filter((e) => e.slot === slotFilter)
  }, [menus, dateFilter, customDate, slotFilter])

  const totalPages = Math.max(1, Math.ceil(mealSlots.length / MEALS_PER_PAGE))
  const pageSlots = mealSlots.slice(
    page * MEALS_PER_PAGE,
    page * MEALS_PER_PAGE + MEALS_PER_PAGE,
  )
  const pageGroups = useMemo(() => groupSlotsByDate(pageSlots), [pageSlots])

  const loadSlotStats = useCallback(
    async (entry, menuDoc = entry.menu) => {
      const participations = await getParticipationsForSlot(
        entry.date,
        entry.slot,
      )
      const plannedItems = getPlannedMenuItems(menuDoc, entry.slot, catalog)
      const slotOverrides = menuDoc?.totalOverrides?.[entry.slot] ?? {}
      return {
        ...buildVoteStats({
          users,
          participations,
          plannedItems,
          totalOverrides: slotOverrides,
        }),
        plannedItems,
        catalog,
      }
    },
    [users, catalog],
  )

  const upsertMenuInList = useCallback((prev, freshMenu) => {
    if (!freshMenu) return prev
    const rest = prev.filter((m) => m.date !== freshMenu.date)
    if (!freshMenu.hasMorning && !freshMenu.hasEvening) return rest
    return [...rest, freshMenu].sort((a, b) => b.date.localeCompare(a.date))
  }, [])

  // Load stats for every slot in the current filter so summary cards stay accurate
  const loadFilterStats = useCallback(async () => {
    if (mealSlots.length === 0) return
    const next = {}
    await Promise.all(
      mealSlots.map(async (entry) => {
        next[entry.key] = await loadSlotStats(entry)
      }),
    )
    setStatsByKey((prev) => ({ ...prev, ...next }))
  }, [mealSlots, loadSlotStats])

  const filterSlotKeys = mealSlots.map((s) => s.key).join(',')

  useEffect(() => {
    if (loading || filterSlotKeys.length === 0) return

    let cancelled = false
    ;(async () => {
      try {
        await loadFilterStats()
      } catch (err) {
        if (!cancelled) toast.error(err.message)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loading, loadFilterStats, filterSlotKeys, toast])

  useEffect(() => {
    setPage(0)
  }, [slotFilter, dateFilter, customDate])

  // Once menus load, land on today if planned; otherwise nearest upcoming planned day
  useEffect(() => {
    if (loading || plannedDates.length === 0 || didInitDateRef.current) return
    didInitDateRef.current = true
    if (plannedDates.includes(todayId)) {
      setDateFilter('custom')
      setCustomDate(todayId)
      return
    }
    const upcoming = [...plannedDates]
      .filter((d) => d >= todayId)
      .sort((a, b) => a.localeCompare(b))
    if (upcoming.length > 0) {
      setDateFilter('custom')
      setCustomDate(upcoming[0])
    } else {
      // Use newest planned day (already sorted desc via getPlannedDateIds)
      setDateFilter('custom')
      setCustomDate(plannedDates[0])
    }
  }, [loading, plannedDates, todayId])

  useEffect(() => {
    if (dateFilter !== 'custom' || plannedDates.length === 0) return
    if (!plannedDates.includes(customDate)) {
      // Prefer today, then nearest upcoming, then newest — never jump to an arbitrary old pick
      if (plannedDates.includes(todayId)) {
        setCustomDate(todayId)
        return
      }
      const upcoming = [...plannedDates]
        .filter((d) => d >= todayId)
        .sort((a, b) => a.localeCompare(b))
      setCustomDate(upcoming[0] ?? plannedDates[0])
    }
  }, [dateFilter, plannedDates, customDate, todayId])

  useEffect(() => {
    if (dateFilter !== 'today_tomorrow') {
      scrolledRef.current = false
      return
    }
    if (loading || scrolledRef.current) return
    const t = setTimeout(() => {
      todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      scrolledRef.current = true
    }, 200)
    return () => clearTimeout(t)
  }, [loading, mealSlots, dateFilter])

  const handleRefreshSlot = async (entry) => {
    setBusyKey(`refresh-${entry.key}`)
    try {
      const freshMenu = await getMenuByDate(entry.date, categoryIds)
      const menu = freshMenu ?? entry.menu
      if (freshMenu) {
        setMenus((prev) => upsertMenuInList(prev, freshMenu))
      }
      const stats = await loadSlotStats(entry, menu)
      setStatsByKey((prev) => ({ ...prev, [entry.key]: stats }))
      setModalSlot((prev) => {
        if (!prev || prev.entry?.key !== entry.key) return prev
        const slotNote =
          entry.slot === 'morning' ? menu.morningNote : menu.eveningNote
        return {
          ...prev,
          stats,
          slotNote,
          entry: { ...entry, menu },
        }
      })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  const handleToggleLock = async (entry, currentlyLocked) => {
    setBusyKey(`lock-${entry.key}`)
    try {
      await setVoteLock(entry.date, entry.slot, !currentlyLocked, user?.uid)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusyKey(null)
    }
  }

  const handleSaveOverride = async (entry, itemId, rawTotal) => {
    if (!canAdjustVoteTotals) return
    setOverrideSavingId(itemId)
    try {
      const total = rawTotal
      await setMenuTotalOverride(entry.date, entry.slot, itemId, total)
      toast.success(
        total === null ? 'Using vote sum again' : 'Total count updated',
      )
      setMenus((prev) =>
        prev.map((m) => {
          if (m.date !== entry.date) return m
          const overrides = {
            morning: { ...(m.totalOverrides?.morning ?? {}) },
            evening: { ...(m.totalOverrides?.evening ?? {}) },
          }
          if (total === null) {
            delete overrides[entry.slot][itemId]
          } else {
            overrides[entry.slot][itemId] = total
          }
          return { ...m, totalOverrides: overrides }
        }),
      )
      const stats = await loadSlotStats(entry)
      setStatsByKey((prev) => ({ ...prev, [entry.key]: stats }))
      setModalSlot((prev) =>
        prev && prev.entry?.key === entry.key ? { ...prev, stats } : prev,
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setOverrideSavingId(null)
    }
  }

  const openCardModal = (stats, entry) => {
    const slotNote =
      entry.slot === 'morning'
        ? entry.menu?.morningNote
        : entry.menu?.eveningNote
    setModalSlot({
      stats,
      entry,
      dateLabel: formatDisplayDateGu(entry.date),
      mealLabel: MEAL_SLOTS[entry.slot].labelEn,
      slotNote,
      slot: entry.slot,
    })
  }

  if (catalogLoading || loading) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page admin-page">
      <header className="page-header">
        <h2>Vote dashboard</h2>
        <p>
          {isMaharaj
            ? 'View adjusted meal totals. Lock or unlock voting per slot.'
            : isAdmin
              ? `Default: today and tomorrow — ${users.length} members in counts. Lock, refresh, and adjust totals on each card.`
              : `View-only — ${users.length} members in counts. Open a card for details.`}
        </p>
      </header>

      <div className="rail-layout">
        <div className="dash-main">
      <div className="dashboard-filters">
        <label>
          Date
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="today_tomorrow">Today and tomorrow</option>
            <option value="all">All dates</option>
            <option value="custom">Specific date</option>
          </select>
        </label>
        <label>
          Slot
          <select value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="morning">{MEAL_SLOTS.morning.labelEn}</option>
            <option value="evening">{MEAL_SLOTS.evening.labelEn}</option>
          </select>
        </label>
        <div className="pagination">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page <= 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span>
            Page {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {mealSlots.length > 0 && (
        <VoteSummary
          mealSlots={mealSlots}
          statsByKey={statsByKey}
          totalMembers={users.length}
        />
      )}

      {mealSlots.length === 0 ? (
        <p className="muted">
          {dateFilter === 'today_tomorrow'
            ? 'No menu planned for today or tomorrow.'
            : dateFilter === 'custom'
              ? 'No menu planned for this date.'
              : 'No menus planned.'}
        </p>
      ) : (
        <div className="menu-list dashboard-by-date">
          {pageGroups.map((group) => {
            const isToday = isTodayDate(group.date)
            const isTomorrow = isTomorrowDate(group.date)
            return (
              <article
                key={group.date}
                id={`dash-day-${group.date}`}
                ref={isToday ? todayRef : null}
                className={`menu-day-card ${isToday ? 'is-today' : ''} ${isTomorrow ? 'is-tomorrow' : ''}`}
              >
                <h2 className="menu-day-title">
                  {formatDisplayDateGu(group.date)}
                  {isToday && <span className="today-badge">Today</span>}
                  {isTomorrow && (
                    <span className="today-badge tomorrow-badge">Tomorrow</span>
                  )}
                </h2>
                <div className="menu-slots-row">
                  {group.slots.map((entry) => (
                    <MealDashboardSlotCard
                      key={entry.key}
                      entry={entry}
                      stats={statsByKey[entry.key]}
                      isToday={isToday}
                      showSlotToolbar
                      canLock={canLockVotes}
                      showVoteBreakdown={showVoteCountBreakdown}
                      lockBusy={busyKey === `lock-${entry.key}`}
                      refreshing={busyKey === `refresh-${entry.key}`}
                      onToggleLock={
                        canLockVotes
                          ? (locked) => handleToggleLock(entry, locked)
                          : undefined
                      }
                      onRefresh={() => handleRefreshSlot(entry)}
                      onCardClick={(s) => openCardModal(s, entry)}
                    />
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
        </div>

        <aside className="rail-col">
          <MealCalendar
            plannedDates={plannedDatesSet}
            selectedDate={dateFilter === 'custom' ? customDate : null}
            today={todayId}
            onSelect={(id) => {
              setDateFilter('custom')
              setCustomDate(id)
            }}
          />
        </aside>
      </div>

      {modalSlot && (
        <MealSlotDetailModal
          stats={modalSlot.stats}
          dateLabel={modalSlot.dateLabel}
          mealLabel={modalSlot.mealLabel}
          slotNote={modalSlot.slotNote}
          slot={modalSlot.slot}
          canAdjustTotals={canAdjustVoteTotals}
          showVoteBreakdown={showVoteCountBreakdown}
          overrideSavingId={overrideSavingId}
          onSaveOverride={
            canAdjustVoteTotals
              ? (itemId, total) =>
                  handleSaveOverride(modalSlot.entry, itemId, total)
              : undefined
          }
          onClose={() => setModalSlot(null)}
        />
      )}
    </div>
  )
}
