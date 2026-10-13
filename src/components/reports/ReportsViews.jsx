import { BarChart3, CalendarDays, Download, Plus, Users } from 'lucide-react'
import { MobilePageHeader } from '../mobile'
import { PageHeader } from '../ui/PageHeader'
import { ReportsAnalytics } from './ReportsAnalytics'
import { ReportsAnalyticsMobile } from './ReportsAnalyticsMobile'
import { ReportsHome } from './ReportsHome'

function HeaderActions({
  isAdmin,
  canViewOthers,
  canWriteReports = true,
  grantedCount,
  onOpenAccess,
  onOpenExport,
  onAddEvent,
  onAddNote,
  analyticsOpen,
  onToggleAnalytics,
}) {
  const showAnalytics = Boolean(canViewOthers)
  return (
    <div className="reports-header-actions">
      {isAdmin ? (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          aria-label="New event"
          onClick={onAddEvent}
        >
          <Plus size={16} aria-hidden />
          <span className="reports-action-label">Event</span>
        </button>
      ) : null}
      {canWriteReports ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          aria-label="Person note"
          onClick={onAddNote}
        >
          <Plus size={16} aria-hidden />
          <span className="reports-action-label">Person note</span>
        </button>
      ) : null}
      {isAdmin ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          aria-label="Who can see everyone's records"
          onClick={onOpenAccess}
        >
          <Users size={16} aria-hidden />
          <span className="reports-action-label">
            Viewers{grantedCount > 0 ? ` (${grantedCount})` : ''}
          </span>
        </button>
      ) : null}
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-label="Export PDF"
        onClick={onOpenExport}
      >
        <Download size={16} aria-hidden />
        <span className="reports-action-label">Export</span>
      </button>
      {showAnalytics ? (
        <button
          type="button"
          className={`btn btn-sm${analyticsOpen ? ' btn-primary' : ' btn-secondary'}`}
          aria-label="Analytics"
          aria-pressed={analyticsOpen}
          onClick={analyticsOpen ? undefined : onToggleAnalytics}
        >
          <BarChart3 size={16} aria-hidden />
          <span className="reports-action-label">Analytics</span>
        </button>
      ) : null}
      {showAnalytics && analyticsOpen ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          aria-label="Calendar"
          onClick={onToggleAnalytics}
        >
          <CalendarDays size={16} aria-hidden />
          <span className="reports-action-label">Calendar</span>
        </button>
      ) : null}
    </div>
  )
}

export function ReportsDesktopView(props) {
  const analyticsOpen = Boolean(props.canViewOthers && props.analyticsOpen)
  return (
    <>
      <PageHeader
        artKey={analyticsOpen ? undefined : 'reports'}
        className={analyticsOpen ? 'reports-analytics-pagehead' : ''}
        size="compact"
        title="Reports"
        description={
          analyticsOpen
            ? props.canWriteReports === false
              ? 'View event analytics for everyone.'
              : 'View event analytics and manage temple records.'
            : props.canWriteReports === false
              ? 'Everyone’s answers and notes. View only.'
              : 'Your answers show here. Fill a row without opening a day.'
        }
        actions={<HeaderActions {...props} analyticsOpen={analyticsOpen} />}
      />
      {analyticsOpen ? (
        <ReportsAnalytics
          events={props.events}
          roster={props.roster}
          responseMap={props.responseMap}
          actorId={props.actorId}
          canViewOthers={props.canViewOthers}
          today={props.today}
        />
      ) : (
        <ReportsHome key={`${props.focusDate || ''}-${props.focusEventId || ''}`} {...props} />
      )}
    </>
  )
}

export function ReportsMobileView(props) {
  const analyticsOpen = Boolean(props.canViewOthers && props.analyticsOpen)
  if (analyticsOpen) {
    return (
      <div className="reports-mobile is-analytics">
        <ReportsAnalyticsMobile
          events={props.events}
          roster={props.roster}
          responseMap={props.responseMap}
          actorId={props.actorId}
          canViewOthers={props.canViewOthers}
          today={props.today}
          isAdmin={props.isAdmin}
          canWriteReports={props.canWriteReports}
          grantedCount={props.grantedCount}
          onOpenAccess={props.onOpenAccess}
          onOpenExport={props.onOpenExport}
          onAddEvent={props.onAddEvent}
          onAddNote={props.onAddNote}
          onShowCalendar={props.onToggleAnalytics}
        />
      </div>
    )
  }

  return (
    <div className="reports-mobile">
      <MobilePageHeader
        artKey="reports"
        size="compact"
        title="Reports"
        description={
          props.canWriteReports === false
            ? 'Everyone’s answers and notes. View only.'
            : 'Your answers show here. Fill a row without opening a day.'
        }
        action={<HeaderActions {...props} />}
      />
      <ReportsHome key={`${props.focusDate || ''}-${props.focusEventId || ''}`} {...props} />
    </div>
  )
}

