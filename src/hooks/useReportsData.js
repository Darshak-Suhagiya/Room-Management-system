import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isAdminRole, isObserverRole } from '../config/rolePermissions'
import { useAuth } from '../contexts/AuthContext'
import {
  createReportEvent,
  createReportNote,
  deleteReportEvent,
  deleteReportNote,
  deleteReportResponse,
  listAllEvents,
  listAllNotes,
  listAllResponses,
  listNotesByAuthor,
  listResponsesForUser,
  saveReportResponse,
  setReportAccessForUser,
  setReportEventDayCancelled,
  updateReportEvent,
  updateReportNote,
} from '../services/reportService'
import {
  isUserApproved,
  listAllUsers,
  listApprovedUsers,
} from '../services/userService'
import { formatDateId } from '../utils/mealDateUtils'
import {
  assertReportFillDate,
  buildDatedRows,
  buildPdfModel,
  buildReportBoard,
  compareNotes,
  indexResponses,
  isEventCancelledOn,
  normalizeDateRange,
} from '../utils/reportAttendance'
import { addDaysToDateId } from '../utils/menuReviewUtils'
import { exportReportsPdf } from '../utils/reportsPdf'

export function useReportsData() {
  const { user, profile, reportAllowedUserIds, canAccessReports, isAdmin, isMaharaj, isObserver } =
    useAuth()
  const actorId = user?.uid || null
  const actorName = profile?.displayName || user?.email || 'Member'
  const canViewOthers = Boolean(canAccessReports)

  const [roster, setRoster] = useState([])
  const [grantPeople, setGrantPeople] = useState([])
  const [events, setEvents] = useState([])
  const [notes, setNotes] = useState([])
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(0)
  const today = formatDateId(new Date())

  const load = useCallback(async () => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    if (!actorId) return

    try {
      const [people, everyone, allEvents, ownResponses, ownNotes, allResponses, allNotes] =
        await Promise.all([
          listApprovedUsers(),
          listAllUsers(),
          listAllEvents(),
          listResponsesForUser(actorId),
          listNotesByAuthor(actorId),
          canViewOthers ? listAllResponses() : Promise.resolve(null),
          canViewOthers ? listAllNotes() : Promise.resolve(null),
        ])
      if (requestId !== requestRef.current) return
      setRoster(people)
      setGrantPeople(
        everyone.filter(
          (person) =>
            isUserApproved(person) &&
            !isAdminRole(person) &&
            !isObserverRole(person),
        ),
      )
      setEvents(allEvents)
      setResponses(allResponses || ownResponses)
      setNotes([...(allNotes || ownNotes)].sort(compareNotes))
      setError('')
    } catch (err) {
      if (requestId !== requestRef.current) return
      setError(err.message || 'Could not load reports.')
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [actorId, canViewOthers])

  useEffect(() => {
    // Data fetch: state updates happen after awaited Firestore reads.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load when the signed-in member changes
    void load()
  }, [load])

  const responseMap = useMemo(
    () => indexResponses(events, responses),
    [events, responses],
  )

  const board = useMemo(
    () =>
      buildReportBoard({
        events,
        responseMap,
        userId: isMaharaj || isObserver ? null : actorId,
        today,
      }),
    [events, responseMap, isMaharaj, isObserver, actorId, today],
  )

  const pastRows = useMemo(
    () =>
      buildDatedRows({
        events,
        from: addDaysToDateId(today, -30),
        to: addDaysToDateId(today, -1),
      }),
    [events, today],
  )

  const saveEvent = useCallback(
    async (input) => {
      setSaving(true)
      try {
        if (input.id) {
          await updateReportEvent(input.id, input, { id: actorId, name: actorName })
        } else {
          await createReportEvent(input, { id: actorId, name: actorName })
        }
        await load()
      } finally {
        setSaving(false)
      }
    },
    [actorId, actorName, load],
  )

  const removeEvent = useCallback(
    async (eventId) => {
      setSaving(true)
      try {
        await deleteReportEvent(eventId)
        await load()
      } finally {
        setSaving(false)
      }
    },
    [load],
  )

  const setEventDayCancelled = useCallback(
    async (eventId, dateId, cancelled) => {
      setSaving(true)
      try {
        await setReportEventDayCancelled(eventId, dateId, cancelled, {
          id: actorId,
          name: actorName,
        })
        await load()
      } finally {
        setSaving(false)
      }
    },
    [actorId, actorName, load],
  )

  const saveResponse = useCallback(
    async (input) => {
      const event = events.find((item) => item.id === input?.eventId)
      if (event && isEventCancelledOn(event, input?.date)) {
        throw new Error('This event is cancelled on that day.')
      }
      assertReportFillDate(input?.date)
      setSaving(true)
      try {
        await saveReportResponse(input, { id: actorId, name: actorName })
        await load()
      } finally {
        setSaving(false)
      }
    },
    [actorId, actorName, events, load],
  )

  const clearResponse = useCallback(
    async (input) => {
      assertReportFillDate(input?.date)
      setSaving(true)
      try {
        await deleteReportResponse(input.eventId, input.date, input.userId)
        await load()
      } finally {
        setSaving(false)
      }
    },
    [load],
  )

  const saveNote = useCallback(
    async (input) => {
      setSaving(true)
      try {
        if (input.id) {
          await updateReportNote(input.id, input, { id: actorId, name: actorName })
        } else {
          await createReportNote(input, { id: actorId, name: actorName })
        }
        await load()
      } finally {
        setSaving(false)
      }
    },
    [actorId, actorName, load],
  )

  const removeNote = useCallback(
    async (noteId) => {
      setSaving(true)
      try {
        await deleteReportNote(noteId)
        await load()
      } finally {
        setSaving(false)
      }
    },
    [load],
  )

  const setPersonAccess = useCallback(async (userId, allowed) => {
    await setReportAccessForUser(userId, allowed, actorId)
  }, [actorId])

  const exportRange = useCallback(
    async (from, to, layout, scope) => {
      const range = normalizeDateRange(from, to)
      const full = scope === 'all' && canViewOthers
      setExporting(true)
      try {
        const [rangeEvents, rangeResponses, rangeNotes] = await Promise.all([
          listAllEvents(),
          full ? listAllResponses() : listResponsesForUser(actorId),
          full ? listAllNotes() : listNotesByAuthor(actorId),
        ])
        const model = buildPdfModel({
          events: rangeEvents,
          responses: rangeResponses,
          notes: rangeNotes,
          from: range.from,
          to: range.to,
          userId: full ? null : actorId,
        })
        await exportReportsPdf({
          from: range.from,
          to: range.to,
          events: model.events,
          notes: model.notes,
          roster: full ? roster : roster.filter((person) => person.id === actorId),
          layout,
        })
      } finally {
        setExporting(false)
      }
    },
    [actorId, canViewOthers, roster],
  )

  return {
    today,
    roster,
    grantPeople,
    allowedUserIds: reportAllowedUserIds,
    canViewOthers,
    isAdmin,
    isMaharaj,
    actorId,
    actorName,
    events,
    notes,
    responses,
    responseMap,
    missing: isMaharaj || isObserver ? [] : board.missing,
    open: isMaharaj || isObserver ? [] : board.open,
    filled: isMaharaj || isObserver ? [] : board.filled,
    pastRows,
    loading,
    saving,
    exporting,
    error,
    reload: load,
    saveEvent,
    removeEvent,
    setEventDayCancelled,
    saveResponse,
    clearResponse,
    saveNote,
    removeNote,
    setPersonAccess,
    exportRange,
  }
}
