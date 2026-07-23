import { Check, Eye } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { ROLE_LABELS } from '../../../config/rolePermissions'

function formatTs(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function NoticeDetailSheet({
  open,
  onClose,
  notice,
  tab,
  canManageNotices,
  canViewNoticeAnalytics,
  saving,
  stats,
  receiptsLoading,
  audienceSummary,
  onEdit,
  onEnd,
}) {
  if (!notice) return null

  return (
    <Modal open={open} onClose={onClose} title={notice.title} wide busy={saving}>
      <div className="notices-detail-sheet mobile-section-gap">
        <p className="notices-detail-msg">{notice.message}</p>
        <p className="muted notices-detail-meta">
          Audience: {audienceSummary(notice)}
          {notice.startAt && <> · Start {String(notice.startAt).slice(0, 10)}</>}
          {notice.endAt && <> · End {String(notice.endAt).slice(0, 10)}</>}
          {notice.endedAt && <> · Ended {formatTs(notice.endedAt)}</>}
        </p>

        {canManageNotices && tab === 'active' && (
          <div className="notices-detail-actions">
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => onEdit(notice)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              disabled={saving}
              onClick={() => onEnd(notice)}
            >
              End now
            </button>
          </div>
        )}

        {canViewNoticeAnalytics && (
          <div className="notices-analytics">
            <div className="notices-analytics-stats notices-analytics-stats-compact">
              <div className="notices-stat">
                <Eye size={14} aria-hidden />
                <span className="notices-stat-value">{stats.seenCount}</span>
                <span className="notices-stat-label">Seen</span>
              </div>
              <div className="notices-stat">
                <Check size={14} aria-hidden />
                <span className="notices-stat-value">{stats.readCount}</span>
                <span className="notices-stat-label">Read</span>
              </div>
            </div>

            {receiptsLoading ? (
              <p className="muted">Loading receipts…</p>
            ) : (
              <>
                <h5 className="notices-analytics-sub">Seen</h5>
                {stats.seen.length === 0 ? (
                  <p className="muted">No one has seen this yet.</p>
                ) : (
                  <ul className="notices-receipt-list">
                    {stats.seen.map((r) => (
                      <li key={`seen-${r.userId}`}>
                        <span>
                          {r.displayName || r.userId}
                          {r.role && (
                            <span className="muted"> ({ROLE_LABELS[r.role] || r.role})</span>
                          )}
                        </span>
                        <span className="muted">{formatTs(r.seenAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <h5 className="notices-analytics-sub">Marked as read</h5>
                {stats.read.length === 0 ? (
                  <p className="muted">No one has marked this as read.</p>
                ) : (
                  <ul className="notices-receipt-list">
                    {stats.read.map((r) => (
                      <li key={`read-${r.userId}`}>
                        <span>
                          {r.displayName || r.userId}
                          {r.role && (
                            <span className="muted"> ({ROLE_LABELS[r.role] || r.role})</span>
                          )}
                        </span>
                        <span className="muted">{formatTs(r.readAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
