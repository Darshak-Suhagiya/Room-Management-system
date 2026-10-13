import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AdminConfirmSheet } from '../components/admin/mobile'
import { ReportAccessSheet } from '../components/reports/ReportAccessSheet'
import { ReportEventForm } from '../components/reports/ReportEventForm'
import { ReportExportSheet } from '../components/reports/ReportExportSheet'
import { ReportNoteForm } from '../components/reports/ReportNoteForm'
import { ReportResponseSheet } from '../components/reports/ReportResponseSheet'
import { EventsLibrarySheet, NotesLibrarySheet } from '../components/reports/ReportsLibraries'
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
import { addDaysToDateId } from '../utils/menuReviewUtils'

export function ReportsPage() {
  const { isAdmin, isObserver, canWriteReports } = useAuth()
  const toast = useToast()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const data = useReportsData()
  const showSkeleton = useDelayedLoading(data.loading)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const fromMeals = searchParams.get('from') === 'meals'

  const [scope, setScope] = useState('self')
  const [eventEditor, setEventEditor] = useState(null)
  const [noteEditor, setNoteEditor] = useState(null)
  const [responseEditor, setResponseEditor] = useState(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)

  useRegisterPullToRefresh(async () => {
    await data.reload()
  })

  const grantedCount = useMemo(
    () =>
      data.grantPeople.filter((person) => data.allowedUserIds.includes(person.id))
        .length,
    [data.grantPeople, data.allowedUserIds],
  )

  const fillEventId = searchParams.get('fill')
  const fillDate = searchParams.get('date')
  const responseTarget = responseEditor

  const closeResponse = () => {
    if (data.saving) return
    setResponseEditor(null)
    if (fromMeals) {
      navigate('/')
      return
    }
    if (searchParams.get('fill') || searchParams.get('date')) {
      const next = new URLSearchParams(searchParams)
      next.delete('fill')
      next.delete('date')
      setSearchParams(next, { replace: true })
    }
  }

  const viewProps = {
    scope: isObserver ? 'everyone' : data.canViewOthers ? scope : 'self',
    onScope: isObserver ? () => {} : setScope,
    canViewOthers: data.canViewOthers,
    canWriteReports,
    events: data.events,
    notes: data.notes,
    roster: data.roster,
    responseMap: data.responseMap,
    isAdmin,
    actorId: data.actorId,
    today: data.today,
    saving: data.saving,
    grantedCount,
    focusDate: fillDate,
    focusEventId: fillEventId,
    onSaveResponse: async (input) => {
      await data.saveResponse({ ...input, displayName: data.actorName })
      toast.success('Report saved')
      if (fromMeals) navigate('/')
    },
    onClearResponse: async (row) => {
      await data.clearResponse({
        eventId: row.event.id,
        date: row.date,
        userId: data.actorId,
      })
      toast.success('Answer cleared')
    },
    onAddEvent: () => setEventsOpen(true),
    onAddNote: canWriteReports ? () => setNotesOpen(true) : undefined,
    onEditNote: (note) => setNoteEditor({ note }),
    onDeleteNote: (note) =>
      setPendingDelete({
        kind: 'note',
        id: note.id,
        label: `Delete this note about ${note.displayName || 'this person'}?`,
      }),
    onEditEvent: (event) => setEventEditor({ event }),
    onDeleteEvent: (event) =>
      setPendingDelete({
        kind: 'event',
        id: event.id,
        label: `Delete ${event.title}? This removes the event from Reports. Past answers for it will no longer show.`,
      }),
    onSetEventDayCancelled: async (eventId, dateId, cancelled) => {
      await data.setEventDayCancelled(eventId, dateId, cancelled)
      toast.success(cancelled ? 'Day cancelled' : 'Day restored')
    },
    onFillSelf: canWriteReports
      ? (row) =>
          setResponseEditor({
            event: row.event,
            date: row.date,
            userId: data.actorId,
            displayName: data.actorName,
            answer: row.answer,
            readOnly: false,
          })
      : undefined,
    onFillPerson: (row) =>
      setResponseEditor({
        event: row.event,
        date: row.date,
        userId: row.userId,
        displayName: row.displayName,
        answer: row.answer,
        readOnly: !isAdmin || !canWriteReports,
      }),
    onOpenAccess: () => setAccessOpen(true),
    onOpenExport: () => setExportOpen(true),
    analyticsOpen: data.canViewOthers ? analyticsOpen : false,
    onToggleAnalytics: () => {
      if (!data.canViewOthers) return
      setAnalyticsOpen((open) => !open)
    },
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

  const saveResponse = async (input) => {
    await data.saveResponse(input)
    closeResponse()
    toast.success('Report saved')
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

  const clearResponse = async (input) => {
    await data.clearResponse(input)
    closeResponse()
    toast.success('Answer cleared')
  }

  const exportPdf = async (from, to, layout, exportScope) => {
    const scopeChoice =
      exportScope ||
      (isObserver || (data.canViewOthers && scope === 'everyone') ? 'all' : 'self')
    await data.exportRange(from, to, layout, scopeChoice)
    setExportOpen(false)
    toast.success('Report downloaded')
  }

  if (data.loading && data.events.length === 0 && !data.error) {
    if (isMobile) {
      return showSkeleton ? (
        <MobilePageSkeleton artKey="reports" title="Reports" />
      ) : null
    }
    return (
      <div className={`page reports-page${isMobile ? ' reports-page-mobile' : ''}`}>
        {showSkeleton ? <MobilePageSkeleton artKey="reports" title="Reports" /> : null}
      </div>
    )
  }

  return (
    <div className={`page reports-page${isMobile ? ' reports-page-mobile' : ''}`}>
      {data.error ? (
        <div>
          <p className="form-error">{data.error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => data.reload()}>
            Retry
          </button>
        </div>
      ) : null}

      {isMobile ? <ReportsMobileView {...viewProps} /> : <ReportsDesktopView {...viewProps} />}

      <NotesLibrarySheet
        open={notesOpen}
        notes={data.notes}
        actorId={data.actorId}
        isAdmin={isAdmin}
        onClose={() => setNotesOpen(false)}
        onAdd={() => {
          setNotesOpen(false)
          setNoteEditor({ note: null })
        }}
        onEdit={(note) => {
          setNotesOpen(false)
          setNoteEditor({ note })
        }}
        onDelete={(note) =>
          setPendingDelete({
            kind: 'note',
            id: note.id,
            label: `Delete this note about ${note.displayName || 'this person'}?`,
          })
        }
      />
      <EventsLibrarySheet
        open={eventsOpen}
        events={data.events}
        onClose={() => setEventsOpen(false)}
        onAdd={() => {
          setEventsOpen(false)
          setEventEditor({ event: null })
        }}
        onEdit={(event) => {
          setEventsOpen(false)
          setEventEditor({ event })
        }}
        onDelete={(event) =>
          setPendingDelete({
            kind: 'event',
            id: event.id,
            label: `Delete ${event.title}? This removes the event from Reports. Past answers for it will no longer show.`,
          })
        }
      />
      <ReportEventForm
        open={Boolean(eventEditor)}
        event={eventEditor?.event ?? null}
        events={data.events}
        saving={data.saving}
        onClose={() => {
          if (!data.saving) setEventEditor(null)
        }}
        onSave={saveEvent}
      />
      <ReportNoteForm
        open={Boolean(noteEditor)}
        note={noteEditor?.note ?? null}
        dateId={data.today}
        roster={data.roster}
        saving={data.saving}
        onClose={() => {
          if (!data.saving) setNoteEditor(null)
        }}
        onSave={saveNote}
      />
      <ReportResponseSheet
        open={Boolean(responseTarget)}
        event={responseTarget?.event ?? null}
        date={responseTarget?.date || ''}
        userId={responseTarget?.userId || ''}
        displayName={responseTarget?.displayName || ''}
        answer={responseTarget?.answer ?? null}
        readOnly={Boolean(responseTarget?.readOnly)}
        saving={data.saving}
        onClose={closeResponse}
        onSave={saveResponse}
        onClear={clearResponse}
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
        initialFrom={addDaysToDateId(data.today, -30)}
        initialTo={data.today}
        initialScope={isObserver || (data.canViewOthers && scope === 'everyone') ? 'all' : 'self'}
        canViewOthers={data.canViewOthers}
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
        busy={data.saving}
        artKey="reports"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
