import { useState } from 'react'
import { MobileNestedScreen } from '../../mobile'
import { AdminSearchField } from '../../admin/mobile'
import { MobileEmptyState } from '../../mobile'
import { AnalyticsDishRow } from './AnalyticsDishRow'
import { AnalyticsDishDetail } from '../AnalyticsDishDetail'

const SORT_OPTIONS = [
  { id: 'timesMade', label: 'Made', dir: 'desc' },
  { id: 'net', label: 'Net', dir: 'desc' },
  { id: 'gu', label: 'Name', dir: 'asc' },
]

export function AnalyticsDishesScreen({
  open,
  onClose,
  rows,
  search,
  onSearchChange,
  sortKey,
  onSortKeyChange,
  onSortDirChange,
  historyMode,
  onHistoryModeChange,
  getHistoryForItem,
}) {
  const [detailId, setDetailId] = useState(null)
  const detailRow = rows.find((r) => r.id === detailId) ?? null
  const history = detailRow ? getHistoryForItem(detailRow.id) : []

  const handleClose = () => {
    setDetailId(null)
    onClose()
  }

  return (
    <MobileNestedScreen
      open={open}
      onClose={detailId ? () => setDetailId(null) : handleClose}
      title={detailRow ? detailRow.gu : 'All dishes'}
      subtitle={
        detailRow
          ? [detailRow.en, detailRow.categoryLabel].filter(Boolean).join(' · ')
          : `${rows.length} item${rows.length === 1 ? '' : 's'}`
      }
      className="analytics-mobile-dishes-screen"
    >
      <div hidden={Boolean(detailId)} className="analytics-mobile-dishes-list-pane mobile-section-gap">
        <AdminSearchField
          value={search}
          onChange={onSearchChange}
          placeholder="Search dishes…"
        />
        <div className="analytics-mobile-sort" role="group" aria-label="Sort dishes">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`btn btn-sm ${sortKey === opt.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => {
                onSortKeyChange(opt.id)
                onSortDirChange(opt.dir)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {rows.length === 0 ? (
          <MobileEmptyState title="No matches" hint="Try another search or category." />
        ) : (
          <div className="analytics-mobile-dish-list">
            {rows.map((row) => (
              <AnalyticsDishRow
                key={row.id}
                row={row}
                onClick={() => setDetailId(row.id)}
              />
            ))}
          </div>
        )}
      </div>

      {detailRow ? (
        <div className="analytics-detail analytics-detail-mobile-nested">
          <AnalyticsDishDetail
            row={detailRow}
            history={history}
            historyMode={historyMode}
            onHistoryModeChange={onHistoryModeChange}
            showTitle={false}
          />
        </div>
      ) : null}
    </MobileNestedScreen>
  )
}
