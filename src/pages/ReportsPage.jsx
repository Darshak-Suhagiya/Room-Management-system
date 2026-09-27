import { useMemo, useState } from 'react'
import { AdminConfirmSheet } from '../components/admin/mobile'
import { ReportAccessSheet } from '../components/reports/ReportAccessSheet'
import { ReportEventForm } from '../components/reports/ReportEventForm'
import { ReportExportSheet } from '../components/reports/ReportExportSheet'
import { ReportNoteForm } from '../components/reports/ReportNoteForm'
import { ReportsDesktopView } from '../components/reports/desktop/ReportsDesktopView'
import { ReportsMobileView } from '../components/reports/mobile/ReportsMobileView'
import '../components/reports/reports.css'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { useReportsData } from '../hooks/useReportsData'
import { MobilePageSkeleton } from '../components/mobile'

export function ReportsPage() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const data = useReportsData()
  const showSkeleton = useDelayedLoading(data.loading)

  const [eventEditor, setEventEditor] = useState(null)
  const [noteEditor, setNoteEditor] = useState(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  useRegisterPullToRefresh(async () => {
    await data.reload()
  })

  const grantedCount = useMemo(
    () =>
      data.grantPeople.filter((person) => data.allowedUserIds.includes(person.id))
        .length,
    [data.grantPeople, data.allowedUserIds],
  )

  const viewProps = {
    dateId: data.dateId,
    onDateChange: data.selectDate,
    events: data.events,
    notes: data.notes,
    roster: data.roster,
    dayLoading: data.dayLoading,
    isAdmin,
    grantedCount,
    onAddEvent: () => setEventEditor({ event: null }),
    onEditEvent: (event) => setEventEditor({ event }),
    onDeleteEvent: (event) =>
      setPendingDelete({
        kind: 'event',
        id: event.id,
        label: `Delete ${event.title}? This removes the attendance log for that event.`,
      }),
    onAddNote: () => setNoteEditor({ note: null }),
    onEditNote: (note) => setNoteEditor({ note }),
    onDeleteNote: (note) =>
      setPendingDelete({
        kind: 'note',
        id: note.id,
        label: `Delete this note about ${note.displayName || 'this person'}?`,
      }),
    onOpenAccess: () => setAccessOpen(true),
    onOpenExport: () => setExportOpen(true),
  }

  const saveEvent = async (input) => {
    await data.saveEvent(input)
    setEventEditor(null)
    toast.success(input.id ? 'Event updated' : 'Event added')
  }

  const saveNote = async (input) => {
    await data.saveNote(input)
    setNoteEditor(null)
    toast.success(input.id ? 'Note updated' : 'Note added')
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      if (pendingDelete.kind === 'event') await data.removeEvent(pendingDelete.id)
      else await data.removeNote(pendingDelete.id)
      toast.success(pendingDelete.kind === 'event' ? 'Event deleted' : 'Note deleted')
      setPendingDelete(null)
    } catch (err) {
      toast.error(err.message || 'Could not delete that.')
    }
  }

  const exportPdf = async (from, to) => {
    await data.exportRange(from, to)
    setExportOpen(false)
    toast.success('Report downloaded')
  }

  if (data.loading && data.events.length === 0 && data.notes.length === 0 && !data.error) {
    if (isMobile) {
      return showSkeleton ? (
        <MobilePageSkeleton artKey="reports" title="Reports" />
      ) : null
    }
    return (
      <div className="page reports-page">
        {showSkeleton ? <MobilePageSkeleton artKey="reports" title="Reports" /> : null}
      </div>
    )
  }

  const failedEmpty =
    Boolean(data.error) && data.events.length === 0 && data.notes.length === 0

  return (
    <div className="page reports-page">
      {data.error ? (
        <div>
          <p className="form-error">{data.error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => data.reload()}>
            Retry
          </button>
        </div>
      ) : null}

      {failedEmpty ? null : isMobile ? (
        <ReportsMobileView {...viewProps} />
      ) : (
        <ReportsDesktopView {...viewProps} />
      )}

      <ReportEventForm
        open={Boolean(eventEditor)}
        event={eventEditor?.event ?? null}
        dateId={data.dateId}
        roster={data.roster}
        saving={data.saving}
        onClose={() => {
          if (!data.saving) setEventEditor(null)
        }}
        onSave={saveEvent}
      />
      <ReportNoteForm
        open={Boolean(noteEditor)}
        note={noteEditor?.note ?? null}
        dateId={data.dateId}
        roster={data.roster}
        saving={data.saving}
        onClose={() => {
          if (!data.saving) setNoteEditor(null)
        }}
        onSave={saveNote}
      />
      <ReportAccessSheet
        open={accessOpen}
        onClose={() => setAccessOpen(false)}
        people={data.grantPeople}
        allowedUserIds={data.allowedUserIds}
        onToggle={data.setPersonAccess}
      />
      <ReportExportSheet
        open={exportOpen}
        onClose={() => {
          if (!data.exporting) setExportOpen(false)
        }}
        initialFrom={data.dateId}
        initialTo={data.dateId}
        exporting={data.exporting}
        onExport={exportPdf}
      />
      <AdminConfirmSheet
        open={Boolean(pendingDelete)}
        onClose={() => {
          if (!data.saving) setPendingDelete(null)
        }}
        title={pendingDelete?.kind === 'note' ? 'Delete this note?' : 'Delete this event?'}
        message={pendingDelete?.label}
        confirmLabel="Delete"
        destructive
        busy={data.saving}
        artKey="reports"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
