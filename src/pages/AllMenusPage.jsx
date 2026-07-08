import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft as IconBack,
  Printer as IconPrinter,
  Table as IconTable,
} from 'lucide-react'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import { getAllPlannedMenus } from '../services/menuService'
import { getPlannedMenuItems } from '../utils/menuVoteUtils'
import { MEAL_SLOTS } from '../config/menuItems'
import { formatDisplayDateGu, isTodayDate } from '../utils/mealDateUtils'

export function AllMenusPage() {
  const {
    catalog,
    loading: catalogLoading,
    categoryIds,
  } = useMenuCatalog({ autoSeed: true })
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const categoryKey = categoryIds.join(',')

  useEffect(() => {
    if (catalogLoading) return

    let cancelled = false
    setLoading(true)

    getAllPlannedMenus(categoryIds)
      .then((data) => {
        if (!cancelled) setMenus(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogLoading, categoryKey])

  const rows = useMemo(() => {
    const out = []
    const sorted = [...menus]
      .filter((m) => m.hasMorning || m.hasEvening)
      .sort((a, b) => a.date.localeCompare(b.date))
    for (const menu of sorted) {
      const slots = []
      if (menu.hasMorning) slots.push('morning')
      if (menu.hasEvening) slots.push('evening')
      for (const slot of slots) {
        const items = getPlannedMenuItems(menu, slot, catalog)
        const byCat = {}
        for (const it of items) {
          if (!byCat[it.categoryId]) byCat[it.categoryId] = []
          byCat[it.categoryId].push(it.gu)
        }
        out.push({
          key: `${menu.date}_${slot}`,
          date: menu.date,
          slot,
          byCat,
          note: slot === 'morning' ? menu.morningNote : menu.eveningNote,
        })
      }
    }
    return out
  }, [menus, catalog])

  const columns = useMemo(() => {
    const used = new Set()
    for (const r of rows) {
      for (const cid of Object.keys(r.byCat)) used.add(cid)
    }
    return (catalog.categories ?? []).filter((c) => used.has(c.id))
  }, [rows, catalog])

  const hasNotes = rows.some((r) => r.note)

  if (catalogLoading || loading) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page all-menus-page">
      <header className="page-header page-header-icon">
        <span className="page-header-icon-wrap" aria-hidden>
          <IconTable size={22} />
        </span>
        <div>
          <h2>All menus</h2>
          <p>Every planned menu in one table, for quick reading.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm no-print"
            onClick={() => window.print()}
          >
            <IconPrinter size={16} />
            Print
          </button>
          <Link to="/" className="btn btn-secondary btn-sm no-print">
            <IconBack size={16} />
            Back to My meals
          </Link>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {rows.length === 0 ? (
        <p className="muted">No menus planned yet.</p>
      ) : (
        <div className="all-menus-table-wrap">
          <table className="all-menus-table">
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th className="col-slot">Meal</th>
                {columns.map((c) => (
                  <th key={c.id}>{c.labelGu}</th>
                ))}
                {hasNotes && <th className="col-note">Note</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const today = isTodayDate(r.date)
                return (
                  <tr key={r.key} className={today ? 'is-today' : ''}>
                    <td className="col-date">
                      {formatDisplayDateGu(r.date)}
                      {today && <span className="today-badge">Today</span>}
                    </td>
                    <td className="col-slot">{MEAL_SLOTS[r.slot].labelEn}</td>
                    {columns.map((c) => (
                      <td key={c.id}>
                        {(r.byCat[c.id] ?? []).join(', ') || '—'}
                      </td>
                    ))}
                    {hasNotes && <td className="col-note">{r.note || ''}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
