import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { MealVotePanel } from '../components/MealVotePanel'
import { MealCalendar } from '../components/MealCalendar'
import { MealDayStrip } from '../components/meals/MealDayStrip'
import { MealSlotTabs } from '../components/meals/MealSlotTabs'
import { MealCalendarSheet } from '../components/meals/MealCalendarSheet'
import { MealsOptionsSheet } from '../components/meals/MealsOptionsSheet'
import { NoticeBannerSlot } from '../components/NoticeBannerSlot'
import { PushPermissionPrompt } from '../components/PushPermissionPrompt'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { MobilePageSkeleton } from '../components/mobile/MobilePageSkeleton'
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
  formatDisplayDateGu,
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
  onToggleOthersFeedback,
  mobile = false,
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
      onToggleOthersFeedback={onToggleOthersFeedback}
      mobile={mobile}
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
  } = useMenuCatalog()
  const [menus, setMenus] = useState([])
  const [menusLoading, setMenusLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('morning')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const mobileInitializedRef = useRef(false)
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
  const isMobileLayout = useMediaQuery('(max-width: 899px)')
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

  const plannedDateIds = useMemo(
    () => [...plannedDates].sort((a, b) => a.localeCompare(b)),
    [plannedDates],
  )

  const mobileStripDateIds = useMemo(() => {
    const future = plannedDateIds.filter((d) => d >= today)
    if (!future.includes(today)) {
      return [today, ...future].sort((a, b) => a.localeCompare(b))
    }
    return future
  }, [plannedDateIds, today])

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
    if (isMobileLayout) return
    setSelectedDate((prev) =>
      prev && plannedDates.has(prev) ? prev : defaultDate,
    )
  }, [defaultDate, plannedDates, isMobileLayout])

  useEffect(() => {
    if (!isMobileLayout || mobileInitializedRef.current || menusLoading) return
    mobileInitializedRef.current = true
    setSelectedDate(today)
  }, [isMobileLayout, menusLoading, today])

  const selectedMenu = sortedMenus.find((m) => m.date === selectedDate) ?? null

  const availableSlots = useMemo(() => {
    if (!selectedMenu) return []
    const slots = []
    if (selectedMenu.hasMorning) slots.push('morning')
    if (selectedMenu.hasEvening) slots.push('evening')
    return slots
  }, [selectedMenu])

  useEffect(() => {
    if (availableSlots.length === 0) return
    if (!availableSlots.includes(selectedSlot)) {
      setSelectedSlot(availableSlots[0])
    }
  }, [selectedDate, availableSlots, selectedSlot])

  const slotComplete = useMemo(() => {
    if (!selectedMenu) return {}
    const out = {}
    for (const slot of availableSlots) {
      const plannedItems = getPlannedMenuItems(selectedMenu, slot, catalog)
      const p = participationByKey[`${selectedMenu.date}_${slot}`]
      out[slot] = hasMealVoteComplete(p, plannedItems)
    }
    return out
  }, [selectedMenu, availableSlots, participationByKey, catalog])

  const showInitialLoad = catalogLoading || menusLoading
  const showLoadSkeleton = useDelayedLoading(showInitialLoad)

  if (showInitialLoad && showLoadSkeleton) {
    return <MobilePageSkeleton />
  }

  const displayError = catalogError || error

  if (showInitialLoad) {
    return null
  }

  const slotPanelProps = {
    userId: user.uid,
    menu: selectedMenu,
    catalog,
    onReloadMenus: loadMenus,
    displayName,
    canReview: canSeeMealReviews,
    showOthersFeedback,
    onToggleOthersFeedback: toggleOthersFeedback,
  }

  return (
    <div className="page meals-page">
      <NoticeBannerSlot page={NOTICE_PAGES.MEALS} />
      <PushPermissionPrompt />

      {seeding && <p className="muted">Loading menus…</p>}
      {displayError && <p className="form-error">{displayError}</p>}

      {/* Desktop layout — unchanged */}
      <div className="meals-layout-desktop">
        <header className="page-header page-header-icon">
          <span className="page-header-icon-wrap" aria-hidden>
            <IconUtensils size={22} />
          </span>
          <div>
            <h2>My meals</h2>
            <p>Pick a day on the calendar. Your vote appears next to each item.</p>
          </div>
        </header>

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
                      {...slotPanelProps}
                      dateId={selectedMenu.date}
                      slot="morning"
                    />
                  )}
                  {selectedMenu.hasEvening && (
                    <SlotWithLock
                      {...slotPanelProps}
                      dateId={selectedMenu.date}
                      slot="evening"
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

      {/* Mobile / PWA layout */}
      <div className="meals-layout-mobile">
        <header className="meals-mobile-top-row">
          <div className="meals-mobile-top-title">
            <span className="meals-mobile-top-icon" aria-hidden>
              <IconUtensils size={20} />
            </span>
            <div>
              <h2>My meals</h2>
              <p className="muted">Pick a day, vote morning or evening.</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm meals-mobile-options-btn"
            onClick={() => setOptionsOpen(true)}
          >
            Options
          </button>
        </header>

        {sortedMenus.length === 0 ? (
          <p className="muted">No menus planned yet.</p>
        ) : (
          <>
            <MealDayStrip
              plannedDateIds={mobileStripDateIds}
              selectedDate={selectedDate}
              today={today}
              dateStatus={dateStatus}
              onSelect={setSelectedDate}
              onOpenCalendar={() => setCalendarOpen(true)}
            />

            <header className="meals-mobile-day-head">
              <span className="meals-mobile-day-label">
                {formatDisplayDateGu(selectedDate ?? today)}
                {isTodayDate(selectedDate ?? today) && (
                  <span className="meals-mobile-day-today"> · Today</span>
                )}
              </span>
            </header>

            {!selectedMenu ? (
              <div className="meals-mobile-empty">
                <p className="meals-mobile-empty-title">
                  {isTodayDate(selectedDate)
                    ? 'No menu planned for today'
                    : 'No menu planned for this day'}
                </p>
                <p className="muted">
                  Pick another date from the strip above or open Calendar to browse
                  all planned menus.
                </p>
              </div>
            ) : (
              <>
                <MealSlotTabs
                  slots={availableSlots}
                  selectedSlot={selectedSlot}
                  slotComplete={slotComplete}
                  onSelect={setSelectedSlot}
                />

                <div className="meals-mobile-slot-panel">
                  {availableSlots.includes(selectedSlot) && (
                    <SlotWithLock
                      {...slotPanelProps}
                      dateId={selectedMenu.date}
                      slot={selectedSlot}
                      mobile
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}

        <MealsOptionsSheet
          open={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          canSeeMealReviews={canSeeMealReviews}
          canSeeMenuAnalytics={canSeeMenuAnalytics}
          showOthersFeedback={showOthersFeedback}
          onToggleOthersFeedback={toggleOthersFeedback}
        />

        <MealCalendarSheet
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          plannedDates={plannedDates}
          selectedDate={selectedDate}
          today={today}
          onSelect={setSelectedDate}
          dateStatus={dateStatus}
        />
      </div>
    </div>
  )
}
