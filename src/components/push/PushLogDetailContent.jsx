import { Check, Smartphone, User, XCircle } from 'lucide-react'
import {
  PUSH_RECIPIENT_STATUS,
  PUSH_RECIPIENT_STATUS_LABELS,
  PUSH_SOURCE_LABELS,
} from '../../config/constants'
import { ROLE_LABELS } from '../../config/rolePermissions'
import { audienceSummary } from '../../services/pushAdminService'
import { recipientStatusReason } from '../../services/pushLogService'

function formatTs(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function sourceLabel(source) {
  if (!source) return 'Unknown'
  return PUSH_SOURCE_LABELS[source] || source
}

function statusPillClass(status) {
  if (status === PUSH_RECIPIENT_STATUS.SUCCESS) return 'push-log-status-success'
  if (status === PUSH_RECIPIENT_STATUS.PARTIAL) return 'push-log-status-partial'
  if (status === PUSH_RECIPIENT_STATUS.FAILED) return 'push-log-status-failed'
  return 'push-log-status-no-tokens'
}

export function PushLogDetailContent({ log }) {
  if (!log) return null

  const recipients = log.recipients ?? []

  return (
    <div className="push-log-detail mobile-section-gap">
      <h3 className="rail-card-title">{log.title}</h3>
      {log.body && (
        <pre className="push-log-body-preview">{log.body}</pre>
      )}
      <p className="muted push-log-detail-meta">
        Source: {sourceLabel(log.source)}
        {log.triggeredBy && <> · {log.triggeredBy === 'automatic' ? 'Automatic' : 'Manual'}</>}
        {log.createdByName && <> · By {log.createdByName}</>}
        {log.sentAt && <> · Sent {formatTs(log.sentAt)}</>}
      </p>
      <p className="muted push-log-detail-meta">
        Audience: {audienceSummary(log.audience)}
      </p>

      <div className="notices-analytics">
        <h4>Delivery summary</h4>
        <div className="notices-analytics-stats">
          <div className="notices-stat">
            <User size={16} aria-hidden />
            <span className="notices-stat-value">{log.recipientUserCount}</span>
            <span className="notices-stat-label">Users</span>
          </div>
          <div className="notices-stat">
            <Smartphone size={16} aria-hidden />
            <span className="notices-stat-value">{log.tokenCount}</span>
            <span className="notices-stat-label">Devices</span>
          </div>
          <div className="notices-stat">
            <Check size={16} aria-hidden />
            <span className="notices-stat-value">{log.successCount}</span>
            <span className="notices-stat-label">OK</span>
          </div>
          <div className="notices-stat">
            <XCircle size={16} aria-hidden />
            <span className="notices-stat-value">{log.failureCount}</span>
            <span className="notices-stat-label">Failed</span>
          </div>
        </div>
      </div>

      {!log.hasRecipientDetails ? (
        <p className="muted push-log-legacy-note">
          Per-user delivery details were not recorded for this send.
        </p>
      ) : (
        <>
          <h4 className="push-log-recipients-heading">Per user</h4>
          <div className="push-logs-recipient-table-wrap layout-desktop">
            <table className="admin-table push-logs-recipient-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Push enabled</th>
                  <th>Devices</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.userId}>
                    <td>
                      {r.displayName}
                      {r.role && (
                        <span className="muted">
                          {' '}
                          ({ROLE_LABELS[r.role] || r.role})
                        </span>
                      )}
                    </td>
                    <td>{r.pushEnabled ? 'Yes' : 'No'}</td>
                    <td>{r.deviceCount}</td>
                    <td>
                      <span
                        className={`push-log-status-pill ${statusPillClass(r.status)}`}
                      >
                        {PUSH_RECIPIENT_STATUS_LABELS[r.status] || r.status}
                      </span>
                    </td>
                    <td className="push-log-reason-cell">
                      {recipientStatusReason(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="push-logs-recipient-list layout-mobile">
            {recipients.map((r) => (
              <li key={r.userId} className="push-logs-recipient-item">
                <div className="push-logs-recipient-top">
                  <span className="push-logs-recipient-name">
                    {r.displayName}
                    {r.role && (
                      <span className="muted">
                        {' '}
                        ({ROLE_LABELS[r.role] || r.role})
                      </span>
                    )}
                  </span>
                  <span
                    className={`push-log-status-pill ${statusPillClass(r.status)}`}
                  >
                    {PUSH_RECIPIENT_STATUS_LABELS[r.status] || r.status}
                  </span>
                </div>
                <div className="push-logs-recipient-meta muted">
                  Push: {r.pushEnabled ? 'Yes' : 'No'} · {r.deviceCount} device
                  {r.deviceCount === 1 ? '' : 's'}
                  {r.successCount > 0 && <> · OK {r.successCount}</>}
                  {r.failureCount > 0 && <> · Fail {r.failureCount}</>}
                </div>
                {recipientStatusReason(r) !== '—' && (
                  <p className="push-logs-recipient-reason muted">
                    {recipientStatusReason(r)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function pushLogListSubtitle(log) {
  const parts = [
    sourceLabel(log.source),
    log.sentAt ? formatTs(log.sentAt) : null,
    `${log.recipientUserCount} user(s)`,
    `OK ${log.successCount} · fail ${log.failureCount}`,
  ].filter(Boolean)
  return parts.join(' · ')
}

export { formatTs, sourceLabel }
