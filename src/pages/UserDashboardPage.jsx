import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MealVotePanel } from '../components/MealVotePanel'
import { MealCalendar } from '../components/MealCalendar'
import { NoticeBannerSlot } from '../components/NoticeBannerSlot'
import { NOTICE_PAGES } from '../config/constants'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import { getAllPlannedMenus } from '../services/menuService'
import { subscribeVoteLock } from '../services/voteLockService'
import { subscribeUserParticipations } from '../services/participationService'
import { getPlannedMenuItems, hasMealVoteComplete } from '../utils/menuVoteUtils'
import {
  BarChart3 as IconChart,
  CalendarDays as IconPlanning,
  Calendar as IconCalendar,
  ChartPie as IconAnalytics,
  ListChecks as IconCatalog,
  Sparkles as IconSeva,
  Table as IconTable,
  UtensilsCrossed as IconUtensils,
} from 'lucide-react'
import {
  formatDateId,
  formatMealDayHeader,
  isTodayDate,
  sortMenusByDateDesc,
} from '../utils/mealDateUtils'

function SlotWithLock({
  userId,
  dateId,
  slot,
  menu,
  catalog,
  onReloadMenus,
  displayName,
  canReview,
  showOthersFeedback,
}) {
  const [locked, setLocked] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    return subscribeVoteLock(dateId, slot, (data) => {
      setLocked(Boolean(data?.locked))
    })
  }, [dateId, slot])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onReloadMenus()
      setRefreshTick((t) => t + 1)
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <MealVotePanel
      key={`${dateId}-${slot}-${refreshTick}`}
      userId={userId}
      dateId={dateId}
      slot={slot}
      menu={menu}
      catalog={catalog}
      locked={locked}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      displayName={displayName}
      canReview={canReview}
      showOthersFeedback={showOthersFeedback}
    />
  )
}

function QuickLinks({
  isMaharaj,
  canAccessVoteDashboard,
  canPlanMenus,
  canEditMenuCatalog,
  canSeeMealReviews,
  canSeeMenuAnalytics,
  showOthersFeedback,
  onToggleOthersFeedback,
}) {
  const links = [
    !isMaharaj && { to: '/menus', label: 'All menus', icon: IconTable },
    !isMaharaj && { to: '/seva', label: 'Room Seva', icon: IconSeva },
    canSeeMenuAnalytics && {
      to: '/analytics',
      label: 'Menu Analytics',
      icon: IconAnalytics,
    },
    canAccessVoteDashboard && {
      to: '/admin/votes',
      label: 'Vote Dashboard',
      icon: IconChart,
    },
    canPlanMenus && {
      to: '/admin/planning',
      label: 'Menu Planning',
      icon: IconPlanning,
    },
    canEditMenuCatalog && {
      to: '/admin/catalog',
      label: 'Menu Editing',
      icon: IconCatalog,
    },
  ].filter(Boolean)

  if (links.length === 0 && !canSeeMealReviews) return null

  return (
    <div className="rail-card quick-links-card">
      <h3 className="rail-card-title">Quick links</h3>
      {links.length > 0 && (
        <ul className="rail-link-list">
          {links.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="rail-link">
                <span className="rail-link-icon" aria-hidden>
                  <Icon size={18} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {canSeeMealReviews && (
        <label className="feedback-switch">
          <span className="feedback-switch-label">Show everyone’s feedback</span>
          <span className="feedback-switch-control">
            <input
              type="checkbox"
              role="switch"
              checked={showOthersFeedback}
              onChange={onToggleOthersFeedback}
              aria-label="Show everyone’s feedback"
            />
            <span className="feedback-switch-track" aria-hidden>
              <span className="feedback-switch-thumb" />
            </span>
          </span>
        </label>
      )}
    </div>
  )
}

const SHOW_FEEDBACK_KEY = 'rm-show-everyone-feedback'

export function UserDashboardPage() {
  const { user, profile, isMaharaj, canAccessVoteDashboard, canPlanMenus, canEditMenuCatalog, canSeeMealReviews, canSeeMenuAnalytics } =
    useAuth()
  const {
    catalog,
    loading: catalogLoading,
    seeding,
    error: catalogError,
    categoryIds,
  } = useMenuCatalog({ autoSeed: true })
  const [menus, setMenus] = useState([])
  const [menusLoading, setMenusLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [participations, setParticipations] = useState([])
  const [showOthersFeedback, setShowOthersFeedback] = useState(() => {
    try {
      const stored = localStorage.getItem(SHOW_FEEDBACK_KEY)
      if (stored === null) return true
      return stored === '1'
    } catch {
      return true
    }
  })

  const categoryKey = categoryIds.join(',')
  const today = formatDateId(new Date())
  const displayName =
    profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Member'

  const toggleOthersFeedback = () => {
    setShowOthersFeedback((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SHOW_FEEDBACK_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const loadMenus = useCallback(async () => {
    const data = await getAllPlannedMenus(categoryIds)
    setMenus(sortMenusByDateDesc(data))
  }, [categoryKey])

  useEffect(() => {
    if (catalogLoading) return

    let cancelled = false
    setMenusLoading(true)

    loadMenus()
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setMenusLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [catalogLoading, loadMenus])

  const sortedMenus = useMemo(
    () => menus.filter((m) => m.hasMorning || m.hasEvening),
    [menus],
  )

  const plannedDates = useMemo(
    () => new Set(sortedMenus.map((m) => m.date)),
    [sortedMenus],
  )

  useEffect(() => {
    if (!user?.uid) return undefined
    return subscribeUserParticipations(user.uid, setParticipations)
  }, [user?.uid])

  const participationByKey = useMemo(() => {
    const map = {}
    for (const p of participations) map[`${p.date}_${p.slot}`] = p
    return map
  }, [participations])

  const dateStatus = useMemo(() => {
    const status = {}
    for (const menu of sortedMenus) {
      const slots = []
      if (menu.hasMorning) slots.push('morning')
      if (menu.hasEvening) slots.push('evening')
      if (slots.length === 0) continue
      let done = 0
      for (const slot of slots) {
        const plannedItems = getPlannedMenuItems(menu, slot, catalog)
        const p = participationByKey[`${menu.date}_${slot}`]
        if (hasMealVoteComplete(p, plannedItems)) done += 1
      }
      status[menu.date] =
        done === slots.length ? 'voted' : done > 0 ? 'partial' : 'none'
    }
    return status
  }, [sortedMenus, participationByKey, catalog])

  const defaultDate = useMemo(() => {
    if (sortedMenus.length === 0) return null
    if (plannedDates.has(today)) return today
    const upcoming = [...plannedDates]
      .filter((d) => d >= today)
      .sort((a, b) => a.localeCompare(b))
    if (upcoming.length > 0) return upcoming[0]
    return sortedMenus[0].date
  }, [sortedMenus, plannedDates, today])

  useEffect(() => {
    setSelectedDate((prev) =>
      prev && plannedDates.has(prev) ? prev : defaultDate,
    )
  }, [defaultDate, plannedDates])

  if (catalogLoading) {
    return <p className="page-loading">Loading…</p>
  }

  const displayError = catalogError || error

  if (menusLoading) {
    return <p className="page-loading">Loading menus…</p>
  }

  const selectedMenu = sortedMenus.find((m) => m.date === selectedDate) ?? null

  return (
    <div className="page meals-page">
      <NoticeBannerSlot page={NOTICE_PAGES.MEALS} />
      <header className="page-header page-header-icon">
        <span className="page-header-icon-wrap" aria-hidden>
          <IconUtensils size={22} />
        </span>
        <div>
          <h2>My meals</h2>
          <p>Pick a day on the calendar. Your vote appears next to each item.</p>
        </div>
      </header>

      {seeding && <p className="muted">Loading menus…</p>}
      {displayError && <p className="form-error">{displayError}</p>}

      <div className="meals-dashboard">
        <div className="meals-main">
          {sortedMenus.length === 0 || !selectedMenu ? (
            <p className="muted">No menus planned yet.</p>
          ) : (
            <article className="menu-day-card">
              <header className="menu-day-header">
                <div className="menu-day-header-text">
                  <IconCalendar size={18} className="menu-day-cal-icon" />
                  <div>
                    <span className="menu-day-date">
                      {formatMealDayHeader(selectedMenu.date).line1}
                    </span>
                    <span className="menu-day-weekday">
                      {formatMealDayHeader(selectedMenu.date).line2}
                    </span>
                  </div>
                </div>
                {isTodayDate(selectedMenu.date) && (
                  <span className="today-badge">Today</span>
                )}
              </header>
              <div className="menu-slots-row">
                {selectedMenu.hasMorning && (
                  <SlotWithLock
                    userId={user.uid}
                    dateId={selectedMenu.date}
                    slot="morning"
                    menu={selectedMenu}
                    catalog={catalog}
                    onReloadMenus={loadMenus}
                    displayName={displayName}
                    canReview={canSeeMealReviews}
                    showOthersFeedback={showOthersFeedback}
                  />
                )}
                {selectedMenu.hasEvening && (
                  <SlotWithLock
                    userId={user.uid}
                    dateId={selectedMenu.date}
                    slot="evening"
                    menu={selectedMenu}
                    catalog={catalog}
                    onReloadMenus={loadMenus}
                    displayName={displayName}
                    canReview={canSeeMealReviews}
                    showOthersFeedback={showOthersFeedback}
                  />
                )}
              </div>
            </article>
          )}
        </div>

        <aside className="meals-rail">
          <MealCalendar
            plannedDates={plannedDates}
            selectedDate={selectedDate}
            today={today}
            onSelect={setSelectedDate}
            dateStatus={dateStatus}
          />
          <QuickLinks
            isMaharaj={isMaharaj}
            canAccessVoteDashboard={canAccessVoteDashboard}
            canPlanMenus={canPlanMenus}
            canEditMenuCatalog={canEditMenuCatalog}
            canSeeMealReviews={canSeeMealReviews}
            canSeeMenuAnalytics={canSeeMenuAnalytics}
            showOthersFeedback={showOthersFeedback}
            onToggleOthersFeedback={toggleOthersFeedback}
          />
        </aside>
      </div>
    </div>
  )
}
