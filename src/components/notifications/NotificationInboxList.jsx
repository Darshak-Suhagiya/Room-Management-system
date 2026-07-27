import {
  PUSH_RECIPIENT_STATUS,
  PUSH_RECIPIENT_STATUS_LABELS,
  PUSH_SOURCE_LABELS,
} from '../../config/constants'
import { formatRelativeTime } from '../../services/notificationInboxService'

function statusPillClass(status) {
  if (status === PUSH_RECIPIENT_STATUS.SUCCESS) return 'push-log-status-success'
  if (status === PUSH_RECIPIENT_STATUS.PARTIAL) return 'push-log-status-partial'
  if (status === PUSH_RECIPIENT_STATUS.FAILED) return 'push-log-status-failed'
  return 'push-log-status-no-tokens'
}

function sourceLabel(source) {
  if (!source) return 'Notification'
  return PUSH_SOURCE_LABELS[source] || source
}

export function NotificationInboxList({
  notifications,
  expandedId,
  busy,
  error,
  onSelect,
  onClearAll,
  showTitle = true,
}) {
  return (
    <div className="notif-inbox-panel-inner">
      <div className="notif-inbox-header">
        {showTitle ? (
          <h2 className="notif-inbox-title">Notifications</h2>
        ) : (
          <span className="notif-inbox-title-spacer" aria-hidden />
        )}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClearAll}
          disabled={busy || notifications.length === 0}
        >
          Clear all
        </button>
      </div>

      {error && <p className="form-error notif-inbox-error">{error}</p>}

      {notifications.length === 0 ? (
        <p className="muted notif-inbox-empty">
          {error ? 'Could not load notifications.' : 'No notifications yet.'}
        </p>
      ) : (
        <ul className="notif-inbox-list">
          {notifications.map((item) => {
            const expanded = expandedId === item.id
            const isUnread = !item.readAt
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`notif-inbox-item${isUnread ? ' is-unread' : ''}${expanded ? ' is-expanded' : ''}`}
                  onClick={() => onSelect(item.id)}
                >
                  <div className="notif-inbox-item-top">
                    <span className="notif-inbox-item-title">{item.title}</span>
                    <span
                      className={`push-log-status-pill ${statusPillClass(item.deliveryStatus)}`}
                    >
                      {PUSH_RECIPIENT_STATUS_LABELS[item.deliveryStatus] ||
                        item.deliveryStatus}
                    </span>
                  </div>
                  {!expanded && item.body && (
                    <p className="notif-inbox-item-preview muted">{item.body}</p>
                  )}
                  <div className="notif-inbox-item-meta muted">
                    <span>{formatRelativeTime(item.sentAt)}</span>
                    <span> · </span>
                    <span>{sourceLabel(item.source)}</span>
                    {item.deviceCount > 0 && (
                      <>
                        <span> · </span>
                        <span>
                          {item.deviceCount} device{item.deviceCount === 1 ? '' : 's'}
                        </span>
                      </>
                    )}
                  </div>
                  {expanded && (
                    <div className="notif-inbox-item-detail">
                      {item.body && (
                        <p className="notif-inbox-item-body">{item.body}</p>
                      )}
                      {item.deliveryMessage && (
                        <p className="notif-inbox-item-delivery muted">
                          {item.deliveryMessage}
                        </p>
                      )}
                      {item.deliveryStatus === PUSH_RECIPIENT_STATUS.NO_TOKENS && (
                        <p className="notif-inbox-item-hint muted">
                          Open Settings to enable push notifications on this device.
                        </p>
                      )}
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
