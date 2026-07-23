import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { MenuPlanningForm, PlanningSelectionPreview } from '../components/MenuPlanningForm'
import { MealCalendar } from '../components/MealCalendar'
import { MealCalendarSheet } from '../components/meals/MealCalendarSheet'
import { MealDayStrip } from '../components/meals/MealDayStrip'
import {
  PlanningMobileForm,
  PlanningPreviewEntryRow,
  PlanningPreviewSheet,
} from '../components/planning/mobile'
import { MobilePageHeader, MobilePageSkeleton } from '../components/mobile'
import { MobileActionBar } from '../components/ui/MobileActionBar'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { useSaveMutation } from '../hooks/useSaveMutation'
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
  const selectedDateRef = useRef(selectedDate)
  selectedDateRef.current = selectedDate
  const [menu, setMenu] = useState(null)
  const [menuLoading, setMenuLoading] = useState(false)
  const { busy: saving, run: runSave } = useSaveMutation()
  const [plannedDates, setPlannedDates] = useState(new Set())
  const [allMenus, setAllMenus] = useState([])
  const [participations, setParticipations] = useState([])
  const [draft, setDraft] = useState(null)
  const [formDirty, setFormDirty] = useState(false)
  const [activeSlot, setActiveSlot] = useState('morning')
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

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

  const dateStatus = useMemo(() => {
    const map = {}
    for (const menu of allMenus) {
      const dateId = menu.dateId ?? menu.id
      if (!dateId) continue
      const hasMorning =
        menu.hasMorning &&
        menu.morning &&
        Object.values(menu.morning).some((ids) => Array.isArray(ids) && ids.length > 0)
      const hasEvening =
        menu.hasEvening &&
        menu.evening &&
        Object.values(menu.evening).some((ids) => Array.isArray(ids) && ids.length > 0)
      map[dateId] = hasMorning || hasEvening ? 'planned' : 'empty'
    }
    return map
  }, [allMenus])

  const showLoadSkeleton = useDelayedLoading(catalogLoading || menuLoading)

  const handleDraftChange = useCallback((next) => {
    setDraft(next)
  }, [])

  const handleSave = async (data) => {
    const dateAtSave = selectedDate
    const { ok, result, error, stale } = await runSave(() =>
      saveMenu(dateAtSave, data, user.uid, categoryIds),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success(
      result.clearedSlots.length > 0
        ? `Menu saved. ${result.clearedSlots
            .map((s) => (s === 'morning' ? 'morning' : 'evening'))
            .join(' and ')} votes and adjusted totals were cleared because the menu changed.`
        : 'Menu plan saved.',
    )
    if (stale || selectedDateRef.current !== dateAtSave) {
      loadHistory().catch(() => {})
      return
    }
    setMenu(result.menu)
    loadHistory().catch(() => {})
  }

  const selectDate = useCallback(
    (dateId) => {
      if (saving) return
      setSelectedDate(dateId)
    },
    [saving],
  )

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
    return showLoadSkeleton ? <MobilePageSkeleton /> : null
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
              onSelect={selectDate}
            />
          </aside>
        </div>
      </div>

      <div className="layout-mobile admin-plan-mobile admin-mobile-page-with-bar">
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
          dateStatus={dateStatus}
          onSelect={selectDate}
          onOpenCalendar={() => setCalendarOpen(true)}
        />

        <p className="admin-plan-mobile-date muted">
          {formatDisplayDateGu(selectedDate)}
        </p>

        {menuLoading ? (
          showLoadSkeleton ? <MobilePageSkeleton /> : null
        ) : (
          <div className="mobile-section-gap admin-plan-mobile-body">
            <PlanningPreviewEntryRow
              draft={draft}
              itemHistoryById={itemHistoryById}
              onOpen={() => setPreviewOpen(true)}
            />

            <PlanningMobileForm
              {...formProps}
              formId={PLAN_FORM_ID}
              activeSlot={activeSlot}
              onActiveSlotChange={setActiveSlot}
            />
          </div>
        )}

        <PlanningPreviewSheet
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          draft={draft}
          catalog={catalog}
          itemHistoryById={itemHistoryById}
        />

        <MealCalendarSheet
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          allowAllDates
          plannedDates={plannedDates}
          selectedDate={selectedDate}
          today={today}
          onSelect={selectDate}
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
