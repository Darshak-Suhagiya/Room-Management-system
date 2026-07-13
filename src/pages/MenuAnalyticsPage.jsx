import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartPie } from 'lucide-react'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import { getAllPlannedMenus } from '../services/menuService'
import { getAllParticipations } from '../services/participationService'
import { formatDisplayDateGu } from '../utils/mealDateUtils'
import {
  ANALYTICS_RANGE_PRESETS,
  REVIEW_RATING_LABELS,
  buildCookCounts,
  buildItemAnalyticsRows,
  buildReviewSentimentByItem,
  countMealSlotsInRange,
  getItemCookHistory,
  resolveAnalyticsRange,
} from '../utils/menuReviewUtils'

const MIN_REVIEWS_FOR_BEST = 3

const RATING_COLORS = {
  good: 'var(--success, #0f766e)',
  okay: 'var(--muted, #64748b)',
  bad: 'var(--danger, #b91c1c)',
}

function SlotLabel({ slot }) {
  return slot === 'morning' ? 'Morning' : 'Evening'
}

function RatingBadge({ rating }) {
  if (!rating) return null
  return (
    <span className={`review-rating-badge rating-${rating}`}>
      {REVIEW_RATING_LABELS[rating] ?? rating}
    </span>
  )
}

export function MenuAnalyticsPage() {
  const {
    catalog,
    loading: catalogLoading,
    categoryIds,
    error: catalogError,
  } = useMenuCatalog({ autoSeed: true })

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
  const [historyMode, setHistoryMode] = useState('range') // last5 | range

  const load = useCallback(async () => {
    if (!categoryIds?.length) {
      setMenus([])
      setParticipations([])
      setLoading(false)
      return
    }
    setLoading(true)
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
      setLoading(false)
    }
  }, [categoryIds])

  useEffect(() => {
    load()
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

  if (catalogLoading || loading) {
    return <p className="page-loading">Loading analytics…</p>
  }

  return (
    <div className="page analytics-page">
      <header className="page-header page-header-icon">
        <span className="page-header-icon-wrap" aria-hidden>
          <ChartPie size={22} />
        </span>
        <div>
          <h2>Menu Analytics</h2>
          <p>
            How often dishes were planned, and Good / Okay / Bad feedback for the
            selected date range. “Times made” counts each morning or evening
            appearance.
          </p>
        </div>
      </header>

      {(error || catalogError) && (
        <p className="form-error">{error || catalogError}</p>
      )}

      <div className="analytics-filters">
        <div className="analytics-preset-row" role="group" aria-label="Date range">
          {[
            { id: ANALYTICS_RANGE_PRESETS.ALL, label: 'All time' },
            { id: ANALYTICS_RANGE_PRESETS.LAST_30, label: 'Last 30 days' },
            { id: ANALYTICS_RANGE_PRESETS.LAST_90, label: 'Last 90 days' },
            { id: ANALYTICS_RANGE_PRESETS.CUSTOM, label: 'Custom' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`btn btn-sm ${preset === opt.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPreset(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {preset === ANALYTICS_RANGE_PRESETS.CUSTOM && (
          <div className="analytics-custom-dates">
            <label>
              From
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </div>
        )}

        <p className="muted analytics-range-label">
          Showing {formatDisplayDateGu(fromDateId)} → {formatDisplayDateGu(toDateId)}
        </p>

        <div className="analytics-filter-row">
          <label>
            Category
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {(catalog.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.labelGu || c.labelEn || c.id}
                </option>
              ))}
            </select>
          </label>
          <label className="analytics-search">
            Search
            <input
              type="search"
              placeholder="Item name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="analytics-overview">
        <div className="stat-card-tile">
          <span className="stat-card-value">{overview.slots}</span>
          <span className="stat-card-label">Meal slots</span>
        </div>
        <div className="stat-card-tile">
          <span className="stat-card-value">{overview.uniqueCooked}</span>
          <span className="stat-card-label">Items cooked</span>
        </div>
        <div className="stat-card-tile">
          <span className="stat-card-value">{overview.totalReviews}</span>
          <span className="stat-card-label">Reviews</span>
        </div>
        <div className="stat-card-tile">
          <span className="stat-card-value analytics-rating-summary">
            <span className="review-count-pill rating-good">{overview.good}</span>
            <span className="review-count-pill rating-okay">{overview.okay}</span>
            <span className="review-count-pill rating-bad">{overview.bad}</span>
          </span>
          <span className="stat-card-label">Good / Okay / Bad</span>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="analytics-chart-card">
          <h3>Top cooked</h3>
          {topCookedChart.length === 0 ? (
            <p className="muted">No cooks in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topCookedChart} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [value, 'Times made']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                />
                <Bar dataKey="count" fill="var(--primary, #0d9488)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="analytics-chart-card">
          <h3>Rating mix</h3>
          {overview.totalReviews === 0 ? (
            <p className="muted">No reviews in this range.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ratingMixChart} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} width={32} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {ratingMixChart.map((entry) => (
                    <Cell key={entry.key} fill={RATING_COLORS[entry.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="analytics-main">
        <div className="analytics-table-wrap">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>
                  <button type="button" className="analytics-sort-btn" onClick={() => toggleSort('gu')}>
                    Item{sortMark('gu')}
                  </button>
                </th>
                <th>
                  <button type="button" className="analytics-sort-btn" onClick={() => toggleSort('categoryLabel')}>
                    Category{sortMark('categoryLabel')}
                  </button>
                </th>
                <th>
                  <button type="button" className="analytics-sort-btn" onClick={() => toggleSort('timesMade')}>
                    Times made{sortMark('timesMade')}
                  </button>
                </th>
                <th>
                  <button type="button" className="analytics-sort-btn" onClick={() => toggleSort('good')}>
                    Good{sortMark('good')}
                  </button>
                </th>
                <th>
                  <button type="button" className="analytics-sort-btn" onClick={() => toggleSort('okay')}>
                    Okay{sortMark('okay')}
                  </button>
                </th>
                <th>
                  <button type="button" className="analytics-sort-btn" onClick={() => toggleSort('bad')}>
                    Bad{sortMark('bad')}
                  </button>
                </th>
                <th>
                  <button type="button" className="analytics-sort-btn" onClick={() => toggleSort('net')}>
                    Net{sortMark('net')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="admin-users-empty">
                    No items match these filters.
                  </td>
                </tr>
              )}
              {filteredRows.map((r) => (
                <tr
                  key={r.id}
                  className={selectedId === r.id ? 'is-selected' : ''}
                  onClick={() => setSelectedId(r.id)}
                >
                  <td>{r.gu}</td>
                  <td className="muted">{r.categoryLabel}</td>
                  <td>{r.timesMade}</td>
                  <td>{r.good}</td>
                  <td>{r.okay}</td>
                  <td>{r.bad}</td>
                  <td>{r.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="analytics-detail">
          {!selectedRow ? (
            <p className="muted">Select an item in the table to see cook history and feedback.</p>
          ) : (
            <>
              <h3>{selectedRow.gu}</h3>
              <p className="muted">{selectedRow.categoryLabel}</p>
              <div className="analytics-detail-summary">
                <span>
                  <strong>{selectedRow.timesMade}</strong> times made
                </span>
                <span className="analytics-rating-summary">
                  <span className="review-count-pill rating-good">{selectedRow.good}</span>
                  <span className="review-count-pill rating-okay">{selectedRow.okay}</span>
                  <span className="review-count-pill rating-bad">{selectedRow.bad}</span>
                </span>
              </div>

              <div className="analytics-history-modes" role="group" aria-label="History mode">
                <button
                  type="button"
                  className={`btn btn-sm ${historyMode === 'last5' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setHistoryMode('last5')}
                >
                  Last 5 cooks
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${historyMode === 'range' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setHistoryMode('range')}
                >
                  All in range
                </button>
              </div>

              {selectedHistory.length === 0 ? (
                <p className="muted">
                  {selectedRow.timesMade === 0
                    ? 'This item was never planned in the selected window.'
                    : 'No cook occasions found.'}
                </p>
              ) : (
                <ul className="analytics-history-list">
                  {selectedHistory.map((occ) => (
                    <li key={`${occ.date}-${occ.slot}`} className="analytics-history-item">
                      <div className="analytics-history-head">
                        <strong>{formatDisplayDateGu(occ.date)}</strong>
                        <span className="muted">
                          <SlotLabel slot={occ.slot} />
                        </span>
                      </div>
                      {occ.reviews.length === 0 ? (
                        <p className="muted analytics-history-empty">No reviews for this meal.</p>
                      ) : (
                        <ul className="analytics-review-list">
                          {occ.reviews.map((rev) => (
                            <li key={`${rev.userId}-${occ.date}-${occ.slot}`}>
                              <div className="analytics-review-meta">
                                <span>{rev.displayName}</span>
                                <RatingBadge rating={rev.rating} />
                              </div>
                              {rev.text ? (
                                <p className="analytics-review-text">{rev.text}</p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>
      </div>

      <section className="analytics-insights">
        <h3>Insights</h3>
        <div className="analytics-insights-grid">
          <div className="analytics-insight-card">
            <h4>Best rated</h4>
            <p className="muted analytics-insight-note">
              At least {MIN_REVIEWS_FOR_BEST} reviews (good − bad)
            </p>
            {insights.bestRated.length === 0 ? (
              <p className="muted">Not enough reviews yet.</p>
            ) : (
              <ul>
                {insights.bestRated.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="analytics-insight-link"
                      onClick={() => setSelectedId(r.id)}
                    >
                      {r.gu}
                    </button>
                    <span className="muted">
                      net {r.net} · {r.totalReviews} reviews
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="analytics-insight-card">
            <h4>Needs attention</h4>
            <p className="muted analytics-insight-note">Most bad ratings or negative net</p>
            {insights.needsAttention.length === 0 ? (
              <p className="muted">No concerning ratings in this range.</p>
            ) : (
              <ul>
                {insights.needsAttention.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="analytics-insight-link"
                      onClick={() => setSelectedId(r.id)}
                    >
                      {r.gu}
                    </button>
                    <span className="muted">
                      bad {r.bad} · net {r.net}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="analytics-insight-card">
            <h4>Never cooked</h4>
            <p className="muted analytics-insight-note">In this date range</p>
            {insights.neverCooked.length === 0 ? (
              <p className="muted">Every catalog item was cooked.</p>
            ) : (
              <ul>
                {insights.neverCooked.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="analytics-insight-link"
                      onClick={() => setSelectedId(r.id)}
                    >
                      {r.gu}
                    </button>
                    <span className="muted">{r.categoryLabel}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
