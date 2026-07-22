import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  MenuPlanningForm,
  PlanningSelectionPreview,
} from '../components/MenuPlanningForm'
import { MealCalendar } from '../components/MealCalendar'
import { MealCalendarSheet } from '../components/meals/MealCalendarSheet'
import { MealDayStrip } from '../components/meals/MealDayStrip'
import { MealSlotTabs } from '../components/meals/MealSlotTabs'
import { MobilePageHeader } from '../components/mobile'
import { MobileActionBar } from '../components/ui/MobileActionBar'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import {
  formatDateId,
  getAllPlannedMenus,
  getMenuByDate,
  saveMenu,
} from '../services/menuService'
import { getAllParticipations } from '../services/participationService'
import { formatDisplayDateGu, getPlannedDateIds } from '../utils/mealDateUtils'
import {
  buildCookCounts,
  buildReviewSentimentByItem,
  dateIdMonthsAgo,
  flattenSelectedItemIds,
  getItemCookHistory,
} from '../utils/menuReviewUtils'

const PLAN_FORM_ID = 'admin-menu-plan-form'

export function AdminMenuPlanningPage() {
  const { user } = useAuth()
  const toast = useToast()
  const {
    catalog,
    loading: catalogLoading,
    seeding,
    error: catalogError,
    categoryIds,
  } = useMenuCatalog({ autoSeed: true })
  const [selectedDate, setSelectedDate] = useState(formatDateId(new Date()))
  const [menu, setMenu] = useState(null)
  const [menuLoading, setMenuLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [plannedDates, setPlannedDates] = useState(new Set())
  const [allMenus, setAllMenus] = useState([])
  const [participations, setParticipations] = useState([])
  const [draft, setDraft] = useState(null)
  const [formDirty, setFormDirty] = useState(false)
  const [activeSlot, setActiveSlot] = useState('morning')
  const [calendarOpen, setCalendarOpen] = useState(false)

  const categoryKey = categoryIds.join(',')
  const today = formatDateId(new Date())
  const fromDate = dateIdMonthsAgo(2, today)

  const loadHistory = useCallback(async () => {
    const [menusData, parts] = await Promise.all([
      getAllPlannedMenus(categoryIds),
      getAllParticipations(),
    ])
    setAllMenus(menusData)
    setParticipations(parts)
    setPlannedDates(new Set(getPlannedDateIds(menusData)))
  }, [categoryKey])

  useEffect(() => {
    if (catalogLoading) return
    loadHistory().catch(() => {})
  }, [catalogLoading, loadHistory])

  useEffect(() => {
    if (catalogLoading) return

    let cancelled = false
    setMenuLoading(true)

    getMenuByDate(selectedDate, categoryIds)
      .then((data) => {
        if (!cancelled) setMenu(data)
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message)
      })
      .finally(() => {
        if (!cancelled) setMenuLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDate, catalogLoading, categoryIds.join(','), toast])

  const cookCounts = useMemo(
    () => buildCookCounts(allMenus, fromDate, today),
    [allMenus, fromDate, today],
  )

  const sentimentByItem = useMemo(
    () => buildReviewSentimentByItem(participations, fromDate, today),
    [participations, fromDate, today],
  )

  const selectedItemIds = useMemo(() => {
    const maps = []
    if (draft?.hasMorning && draft.morning) maps.push(draft.morning)
    if (draft?.hasEvening && draft.evening) maps.push(draft.evening)
    return flattenSelectedItemIds(maps)
  }, [draft])

  const itemHistoryById = useMemo(() => {
    const map = {}
    for (const id of selectedItemIds) {
      map[id] = getItemCookHistory(id, allMenus, participations, 5)
    }
    return map
  }, [selectedItemIds, allMenus, participations])

  const stripDateIds = useMemo(() => {
    const ids = new Set([today, selectedDate, ...plannedDates])
    return [...ids].sort((a, b) => a.localeCompare(b))
  }, [today, selectedDate, plannedDates])

  const handleDraftChange = useCallback((next) => {
    setDraft(next)
  }, [])

  const handleSave = async (data) => {
    setSaving(true)
    try {
      const { menu: saved, clearedSlots } = await saveMenu(
        selectedDate,
        data,
        user.uid,
        categoryIds,
      )
      setMenu(saved)
      if (clearedSlots.length > 0) {
        const labels = clearedSlots
          .map((s) => (s === 'morning' ? 'morning' : 'evening'))
          .join(' and ')
        toast.success(
          `Menu saved. ${labels} votes and adjusted totals were cleared because the menu changed.`,
        )
      } else {
        toast.success('Menu plan saved.')
      }
      loadHistory().catch(() => {})
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const formProps = {
    dateId: selectedDate,
    initialMenu: menu,
    catalog,
    categoryIds,
    onSave: handleSave,
    saving,
    cookCounts,
    sentimentByItem,
    onDraftChange: handleDraftChange,
    onDirtyChange: setFormDirty,
  }

  if (catalogLoading) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page admin-page admin-plan-page">
      <div className="layout-desktop">
        <header className="page-header">
          <h2>Menu planning</h2>
          <p>
            Pick a date and plan morning and/or evening — you do not need both.
            Notes for everyone and for Maharaj can be set per slot. Selected dishes
            show Good/Okay/Bad counts; use the info button for date- and person-wise
            reviews from the last 5 cooks.
          </p>
        </header>

        {seeding && <p className="muted">Setting up menu list…</p>}
        {catalogError && <p className="form-error">{catalogError}</p>}

        <div className="rail-layout">
          <div className="plan-main">
            {menuLoading ? (
              <p className="muted">Loading menu for this date…</p>
            ) : (
              <div className="admin-grid">
                <section className="admin-preview">
                  <h3>Preview &amp; feedback</h3>
                  <PlanningSelectionPreview
                    draft={draft}
                    catalog={catalog}
                    itemHistoryById={itemHistoryById}
                  />
                </section>
                <section className="admin-editor">
                  <h3>Plan menu</h3>
                  <MenuPlanningForm {...formProps} />
                </section>
              </div>
            )}
          </div>

          <aside className="rail-col">
            <MealCalendar
              allowAllDates
              plannedDates={plannedDates}
              selectedDate={selectedDate}
              today={today}
              onSelect={setSelectedDate}
            />
          </aside>
        </div>
      </div>

      <div className="layout-mobile admin-plan-mobile">
        <MobilePageHeader
          icon={CalendarDays}
          title="Menu planning"
          description="Plan morning and/or evening for a date."
        />

        {seeding && <p className="muted">Setting up menu list…</p>}
        {catalogError && <p className="form-error">{catalogError}</p>}

        <MealDayStrip
          plannedDateIds={stripDateIds}
          selectedDate={selectedDate}
          today={today}
          onSelect={setSelectedDate}
          onOpenCalendar={() => setCalendarOpen(true)}
        />

        <p className="admin-plan-mobile-date muted">
          {formatDisplayDateGu(selectedDate)}
        </p>

        {menuLoading ? (
          <p className="muted">Loading menu for this date…</p>
        ) : (
          <div className="mobile-section-gap admin-plan-mobile-body">
            <details className="plan-preview-collapsible">
              <summary>Preview &amp; feedback</summary>
              <PlanningSelectionPreview
                draft={draft}
                catalog={catalog}
                itemHistoryById={itemHistoryById}
              />
            </details>

            <MealSlotTabs
              slots={['morning', 'evening']}
              selectedSlot={activeSlot}
              onSelect={setActiveSlot}
            />

            <MenuPlanningForm
              {...formProps}
              formId={PLAN_FORM_ID}
              hideActions
              visibleSlot={activeSlot}
              className="admin-plan-mobile-form"
            />
          </div>
        )}

        <MealCalendarSheet
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          allowAllDates
          plannedDates={plannedDates}
          selectedDate={selectedDate}
          today={today}
          onSelect={setSelectedDate}
        />

        <MobileActionBar open={formDirty || saving}>
          <button
            type="submit"
            form={PLAN_FORM_ID}
            className="btn btn-primary btn-block"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save plan'}
          </button>
        </MobileActionBar>
      </div>
    </div>
  )
}
