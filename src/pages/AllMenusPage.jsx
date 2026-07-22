import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft as IconBack,
  Printer as IconPrinter,
  Table as IconTable,
} from 'lucide-react'
import { MobilePageHeader } from '../components/mobile'
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
  const [mobileSearch, setMobileSearch] = useState('')

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

  const mobileByDate = useMemo(() => {
    const q = mobileSearch.trim().toLowerCase()
    const map = new Map()
    for (const r of rows) {
      if (q) {
        const haystack = [
          formatDisplayDateGu(r.date),
          MEAL_SLOTS[r.slot].labelEn,
          ...Object.values(r.byCat).flat(),
          r.note ?? '',
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) continue
      }
      if (!map.has(r.date)) map.set(r.date, [])
      map.get(r.date).push(r)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [rows, mobileSearch])

  if (catalogLoading || loading) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page all-menus-page">
      <div className="layout-desktop">
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

      <div className="layout-mobile mobile-section-gap">
        <MobilePageHeader
          icon={IconTable}
          title="All menus"
          description="Browse every planned menu by day."
          action={
            <Link to="/" className="btn btn-secondary btn-sm">
              <IconBack size={16} />
              Back
            </Link>
          }
        />

        {error && <p className="form-error">{error}</p>}

        {rows.length === 0 ? (
          <p className="muted">No menus planned yet.</p>
        ) : (
          <div className="all-menus-mobile-list">
            <label className="all-menus-mobile-search">
              <span className="sr-only">Search menus</span>
              <input
                type="search"
                placeholder="Search date or dish…"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
              />
            </label>

            {mobileByDate.length === 0 ? (
              <p className="muted">No menus match your search.</p>
            ) : (
              mobileByDate.map(([date, slotRows]) => {
                const today = isTodayDate(date)
                return (
                  <article
                    key={date}
                    className={`all-menus-mobile-day-card${today ? ' is-today' : ''}`}
                  >
                    <header className="all-menus-mobile-day-head">
                      <strong>{formatDisplayDateGu(date)}</strong>
                      {today && <span className="today-badge">Today</span>}
                    </header>
                    {slotRows.map((r) => (
                      <div key={r.key} className="all-menus-mobile-slot">
                        <div
                          className={`all-menus-mobile-slot-head slot-${r.slot}`}
                        >
                          {MEAL_SLOTS[r.slot].labelEn}
                        </div>
                        <dl className="grid gap-2">
                          {columns.map((c) => {
                            const dishes = (r.byCat[c.id] ?? []).join(', ') || '—'
                            return (
                              <div key={c.id}>
                                <dt className="text-xs font-semibold uppercase text-muted">
                                  {c.labelGu}
                                </dt>
                                <dd className="text-sm mt-0.5">{dishes}</dd>
                              </div>
                            )
                          })}
                          {hasNotes && r.note && (
                            <div>
                              <dt className="text-xs font-semibold uppercase text-muted">
                                Note
                              </dt>
                              <dd className="text-sm mt-0.5">{r.note}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    ))}
                  </article>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
