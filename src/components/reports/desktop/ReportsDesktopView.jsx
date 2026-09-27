import { Download, Users } from 'lucide-react'
import { PageHeader } from '../../ui/PageHeader'
import { ReportDateBar } from '../ReportDateBar'
import { ReportDayBody } from '../ReportDayBody'

function HeaderActions({ isAdmin, grantedCount, onOpenAccess, onOpenExport }) {
  return (
    <div className="reports-header-actions">
      {isAdmin ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenAccess}>
          <Users size={16} aria-hidden />
          Access{grantedCount > 0 ? ` (${grantedCount})` : ''}
        </button>
      ) : null}
      <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenExport}>
        <Download size={16} aria-hidden />
        Export
      </button>
    </div>
  )
}

export function ReportsDesktopView({
  dateId,
  onDateChange,
  events,
  notes,
  roster,
  dayLoading,
  isAdmin,
  grantedCount,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onAddNote,
  onEditNote,
  onDeleteNote,
  onOpenAccess,
  onOpenExport,
}) {
  return (
    <>
      <PageHeader
        artKey="reports"
        size="compact"
        title="Reports"
        description="Log event attendance and notes for a day, then export a date range."
        actions={
          <HeaderActions
            isAdmin={isAdmin}
            grantedCount={grantedCount}
            onOpenAccess={onOpenAccess}
            onOpenExport={onOpenExport}
          />
        }
      />
      <ReportDateBar dateId={dateId} onChange={onDateChange} />
      <ReportDayBody
        events={events}
        notes={notes}
        roster={roster}
        dayLoading={dayLoading}
        onAddEvent={onAddEvent}
        onEditEvent={onEditEvent}
        onDeleteEvent={onDeleteEvent}
        onAddNote={onAddNote}
        onEditNote={onEditNote}
        onDeleteNote={onDeleteNote}
      />
    </>
  )
}
