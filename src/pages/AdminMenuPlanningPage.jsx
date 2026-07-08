import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { MenuPlanningForm } from '../components/MenuPlanningForm'
import { MenuCard } from '../components/MenuCard'
import { MealCalendar } from '../components/MealCalendar'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import {
  formatDateId,
  getAllPlannedMenus,
  getMenuByDate,
  saveMenu,
} from '../services/menuService'
import { getPlannedDateIds } from '../utils/mealDateUtils'

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

  const categoryKey = categoryIds.join(',')

  const loadPlannedDates = useCallback(async () => {
    const data = await getAllPlannedMenus(categoryIds)
    setPlannedDates(new Set(getPlannedDateIds(data)))
  }, [categoryKey])

  useEffect(() => {
    if (catalogLoading) return
    loadPlannedDates().catch(() => {})
  }, [catalogLoading, loadPlannedDates])

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
      loadPlannedDates().catch(() => {})
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (catalogLoading) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page admin-page">
      <header className="page-header">
        <h2>Menu planning</h2>
        <p>
          Pick a date and plan morning and/or evening — you do not need both.
          Add a note per slot to inform everyone (shown on menu cards).
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
                <h3>Preview</h3>
                <MenuCard
                  menu={menu ? { ...menu, date: selectedDate } : null}
                  catalog={catalog}
                />
              </section>
              <section className="admin-editor">
                <h3>Plan menu</h3>
                <MenuPlanningForm
                  dateId={selectedDate}
                  initialMenu={menu}
                  catalog={catalog}
                  categoryIds={categoryIds}
                  onSave={handleSave}
                  saving={saving}
                />
              </section>
            </div>
          )}
        </div>

        <aside className="rail-col">
          <MealCalendar
            allowAllDates
            plannedDates={plannedDates}
            selectedDate={selectedDate}
            today={formatDateId(new Date())}
            onSelect={setSelectedDate}
          />
        </aside>
      </div>
    </div>
  )
}
