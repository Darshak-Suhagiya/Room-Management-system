import { useState } from 'react'
import { ChartPie, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { MobilePageHeader, MobileEmptyState, MobileNestedScreen } from '../../mobile'
import { MIN_REVIEWS_FOR_BEST, getAnalyticsPresetLabel } from '../../../hooks/useMenuAnalytics'
import { ANALYTICS_RANGE_PRESETS } from '../../../utils/menuReviewUtils'
import { formatDisplayDateGu } from '../../../utils/mealDateUtils'
import { triggerSelectionHaptic } from '../../../utils/haptics'
import { AnalyticsFilterSheet } from './AnalyticsFilterSheet'
import { AnalyticsDishesScreen } from './AnalyticsDishesScreen'
import { AnalyticsDishDetail } from '../AnalyticsDishDetail'
import './analytics-mobile.css'

function InsightGroup({ title, note, empty, items, getMeta, onSelect }) {
  return (
    <section className="analytics-mobile-insight-group">
      <h3>{title}</h3>
      <p className="muted analytics-mobile-insight-note">{note}</p>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ul className="analytics-mobile-insight-list">
          {items.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="analytics-mobile-insight-row"
                onClick={() => {
                  triggerSelectionHaptic()
                  onSelect(row.id)
                }}
              >
                <span className="analytics-mobile-insight-row-main">
                  <strong>{row.gu}</strong>
                  <span className="muted">{getMeta(row)}</span>
                </span>
                <ChevronRight size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function AnalyticsMobileView({ analytics }) {
  const {
    catalog,
    error,
    catalogError,
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    categoryFilter,
    setCategoryFilter,
    categoryFilterLabel,
    search,
    setSearch,
    sortKey,
    setSortKey,
    setSortDir,
    historyMode,
    setHistoryMode,
    fromDateId,
    toDateId,
    rows,
    filteredRows,
    overview,
    topCookedRows,
    insights,
    getHistoryForItem,
  } = analytics

  const [filterOpen, setFilterOpen] = useState(false)
  const [dishesOpen, setDishesOpen] = useState(false)
  const [detailId, setDetailId] = useState(null)

  const detailRow =
    filteredRows.find((r) => r.id === detailId) ??
    rows.find((r) => r.id === detailId) ??
    null
  const detailHistory = detailRow ? getHistoryForItem(detailRow.id) : []

  const scopedInsights = {
    bestRated:
      categoryFilter === 'all'
        ? insights.bestRated
        : insights.bestRated.filter((r) => r.categoryId === categoryFilter),
    needsAttention:
      categoryFilter === 'all'
        ? insights.needsAttention
        : insights.needsAttention.filter((r) => r.categoryId === categoryFilter),
    neverCooked:
      categoryFilter === 'all'
        ? insights.neverCooked
        : insights.neverCooked.filter((r) => r.categoryId === categoryFilter),
  }
  const scopedTopCooked =
    categoryFilter === 'all'
      ? topCookedRows
      : topCookedRows.filter((r) => r.categoryId === categoryFilter)

  const maxCooked = scopedTopCooked[0]?.timesMade || 1
  const presetLabel =
    preset === ANALYTICS_RANGE_PRESETS.CUSTOM
      ? `${formatDisplayDateGu(fromDateId)} – ${formatDisplayDateGu(toDateId)}`
      : getAnalyticsPresetLabel(preset)

  const openDetail = (id) => {
    triggerSelectionHaptic()
    setDetailId(id)
  }

  return (
    <div className="analytics-mobile admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        icon={ChartPie}
        title="Menu Analytics"
        description="How often dishes were cooked, and how they were rated."
      />

      {(error || catalogError) && (
        <p className="form-error">{error || catalogError}</p>
      )}

      <button
        type="button"
        className="analytics-mobile-range-chip"
        onClick={() => setFilterOpen(true)}
      >
        <SlidersHorizontal size={16} aria-hidden />
        <span>
          {presetLabel}
          <span className="muted"> · {categoryFilterLabel}</span>
        </span>
        <ChevronRight size={16} aria-hidden />
      </button>

      <p className="muted analytics-mobile-range-dates">
        {formatDisplayDateGu(fromDateId)} → {formatDisplayDateGu(toDateId)}
      </p>

      <div className="analytics-mobile-stats">
        <div className="analytics-mobile-stat">
          <span className="analytics-mobile-stat-value">{overview.slots}</span>
          <span className="analytics-mobile-stat-label">Meal slots</span>
        </div>
        <div className="analytics-mobile-stat">
          <span className="analytics-mobile-stat-value">{overview.uniqueCooked}</span>
          <span className="analytics-mobile-stat-label">Items cooked</span>
        </div>
        <div className="analytics-mobile-stat">
          <span className="analytics-mobile-stat-value">{overview.totalReviews}</span>
          <span className="analytics-mobile-stat-label">Reviews</span>
        </div>
        <div className="analytics-mobile-stat">
          <span className="analytics-mobile-stat-value analytics-rating-summary">
            <span className="review-count-pill rating-good">{overview.good}</span>
            <span className="review-count-pill rating-okay">{overview.okay}</span>
            <span className="review-count-pill rating-bad">{overview.bad}</span>
          </span>
          <span className="analytics-mobile-stat-label">Good / Okay / Bad</span>
        </div>
      </div>

      <InsightGroup
        title="Best rated"
        note={`At least ${MIN_REVIEWS_FOR_BEST} reviews (good − bad)`}
        empty="Not enough reviews yet."
        items={scopedInsights.bestRated}
        getMeta={(r) => `net ${r.net} · ${r.totalReviews} reviews`}
        onSelect={openDetail}
      />

      <InsightGroup
        title="Needs attention"
        note="Most bad ratings or negative net"
        empty="No concerning ratings in this range."
        items={scopedInsights.needsAttention}
        getMeta={(r) => `bad ${r.bad} · net ${r.net}`}
        onSelect={openDetail}
      />

      <InsightGroup
        title="Never cooked"
        note="In this date range"
        empty="Every catalog item was cooked."
        items={scopedInsights.neverCooked}
        getMeta={(r) => r.categoryLabel}
        onSelect={openDetail}
      />

      <section className="analytics-mobile-top">
        <h3>Top cooked</h3>
        {scopedTopCooked.length === 0 ? (
          <MobileEmptyState title="No cooks" hint="Nothing was planned in this range." />
        ) : (
          <ol className="analytics-mobile-rank-list">
            {scopedTopCooked.map((row, index) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="analytics-mobile-rank-row"
                  onClick={() => openDetail(row.id)}
                >
                  <span className="analytics-mobile-rank-index">{index + 1}</span>
                  <span className="analytics-mobile-rank-body">
                    <span className="analytics-mobile-rank-head">
                      <strong>{row.gu}</strong>
                      <span>{row.timesMade}</span>
                    </span>
                    <span
                      className="analytics-mobile-rank-bar"
                      style={{ width: `${Math.max(8, (row.timesMade / maxCooked) * 100)}%` }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <button
        type="button"
        className="analytics-mobile-browse"
        onClick={() => setDishesOpen(true)}
      >
        <span>
          <strong>All dishes</strong>
          <span className="muted">
            {filteredRows.length} in this filter
          </span>
        </span>
        <ChevronRight size={18} aria-hidden />
      </button>

      <AnalyticsFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        preset={preset}
        onPresetChange={setPreset}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        customTo={customTo}
        onCustomToChange={setCustomTo}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={catalog.categories}
      />

      <AnalyticsDishesScreen
        open={dishesOpen}
        onClose={() => setDishesOpen(false)}
        rows={filteredRows}
        search={search}
        onSearchChange={setSearch}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        onSortDirChange={setSortDir}
        historyMode={historyMode}
        onHistoryModeChange={setHistoryMode}
        getHistoryForItem={getHistoryForItem}
      />

      <MobileNestedScreen
        open={Boolean(detailRow)}
        onClose={() => setDetailId(null)}
        title={detailRow?.gu ?? 'Dish'}
        subtitle={
          detailRow
            ? [detailRow.en, detailRow.categoryLabel].filter(Boolean).join(' · ')
            : undefined
        }
      >
        {detailRow ? (
          <div className="analytics-detail analytics-detail-mobile-nested">
            <AnalyticsDishDetail
              row={detailRow}
              history={detailHistory}
              historyMode={historyMode}
              onHistoryModeChange={setHistoryMode}
              showTitle={false}
            />
          </div>
        ) : null}
      </MobileNestedScreen>
    </div>
  )
}
