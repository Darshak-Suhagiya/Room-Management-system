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
import { AnalyticsDishDetail } from '../components/analytics/AnalyticsDishDetail'
import { AnalyticsMobileView } from '../components/analytics/mobile'
import { MobilePageSkeleton } from '../components/mobile'
import { useMenuAnalytics, ANALYTICS_PRESET_OPTIONS } from '../hooks/useMenuAnalytics'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { formatDisplayDateGu } from '../utils/mealDateUtils'
import { ANALYTICS_RANGE_PRESETS } from '../utils/menuReviewUtils'

const RATING_COLORS = {
  good: 'var(--success, #0f766e)',
  okay: 'var(--muted, #64748b)',
  bad: 'var(--danger, #b91c1c)',
}

export function MenuAnalyticsPage() {
  const analytics = useMenuAnalytics()
  const isMobile = useMediaQuery('(max-width: 899px)')

  const {
    catalog,
    catalogLoading,
    catalogError,
    loading,
    error,
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    categoryFilter,
    setCategoryFilter,
    search,
    setSearch,
    selectedId,
    setSelectedId,
    historyMode,
    setHistoryMode,
    fromDateId,
    toDateId,
    filteredRows,
    overview,
    topCookedChart,
    ratingMixChart,
    insights,
    selectedRow,
    selectedHistory,
    toggleSort,
    sortMark,
  } = analytics

  if (catalogLoading || loading) {
    if (isMobile) return <MobilePageSkeleton />
    return <p className="page-loading">Loading analytics…</p>
  }

  if (isMobile) {
    return (
      <div className="page analytics-page">
        <AnalyticsMobileView analytics={analytics} />
      </div>
    )
  }

  return (
    <div className="page analytics-page">
      <div className="layout-desktop">
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
      </div>

      <div className="mobile-section-gap">
      {(error || catalogError) && (
        <p className="form-error">{error || catalogError}</p>
      )}

      <div className="analytics-filters">
        <div className="analytics-preset-row" role="group" aria-label="Date range">
          {ANALYTICS_PRESET_OPTIONS.map((opt) => (
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
          <AnalyticsDishDetail
            row={selectedRow}
            history={selectedHistory}
            historyMode={historyMode}
            onHistoryModeChange={setHistoryMode}
          />
        </aside>
      </div>

      <section className="analytics-insights">
        <h3>Insights</h3>
        <div className="analytics-insights-grid">
          <div className="analytics-insight-card">
            <h4>Best rated</h4>
            <p className="muted analytics-insight-note">
              At least 3 reviews (good − bad)
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
    </div>
  )
}
