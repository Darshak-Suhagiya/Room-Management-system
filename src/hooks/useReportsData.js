import { useCallback, useEffect, useRef, useState } from 'react'
import { isAdminRole } from '../config/rolePermissions'
import { useAuth } from '../contexts/AuthContext'
import {
  createReportEvent,
  createReportNote,
  deleteReportEvent,
  deleteReportNote,
  listEventsForDate,
  listEventsInRange,
  listNotesForDate,
  listNotesInRange,
  setReportAccessForUser,
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
  compareEvents,
  compareNotes,
  normalizeDateRange,
} from '../utils/reportAttendance'
import { exportReportsPdf } from '../utils/reportsPdf'

export function useReportsData() {
  const { user, profile, reportAllowedUserIds } = useAuth()
  const actorId = user?.uid || null
  const actorName = profile?.displayName || user?.email || 'Member'

  const [dateId, setDateIdState] = useState(() => formatDateId(new Date()))
  const [roster, setRoster] = useState([])
  const [grantPeople, setGrantPeople] = useState([])
  const [events, setEvents] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dayLoading, setDayLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(0)

  const selectDate = useCallback((next) => {
    if (!next || next === dateId) return
    setEvents([])
    setNotes([])
    setDayLoading(true)
    setDateIdState(next)
  }, [dateId])

  const load = useCallback(async () => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId

    try {
      const [people, everyone, dayEvents, dayNotes] = await Promise.all([
        listApprovedUsers(),
        listAllUsers(),
        listEventsForDate(dateId),
        listNotesForDate(dateId),
      ])
      if (requestId !== requestRef.current) return
      setRoster(people)
      setGrantPeople(
        everyone.filter(
          (person) => isUserApproved(person) && !isAdminRole(person),
        ),
      )
      setEvents([...dayEvents].sort(compareEvents))
      setNotes([...dayNotes].sort(compareNotes))
      setError('')
    } catch (err) {
      if (requestId !== requestRef.current) return
      setError(err.message || 'Could not load reports.')
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false)
        setDayLoading(false)
      }
    }
  }, [dateId])

  useEffect(() => {
    // Data fetch: state updates happen after awaited Firestore reads.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load when the selected day changes
    void load()
  }, [load])

  const saveEvent = useCallback(
    async (input) => {
      setSaving(true)
      try {
        if (input.id) {
          await updateReportEvent(input.id, input, { id: actorId, name: actorName })
        } else {
          await createReportEvent(input, { id: actorId, name: actorName })
        }
        if (input.date !== dateId) selectDate(input.date)
        else await load()
      } finally {
        setSaving(false)
      }
    },
    [actorId, actorName, dateId, load, selectDate],
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

  const saveNote = useCallback(
    async (input) => {
      setSaving(true)
      try {
        if (input.id) {
          await updateReportNote(input.id, input, { id: actorId, name: actorName })
        } else {
          await createReportNote(input, { id: actorId, name: actorName })
        }
        if (input.date !== dateId) selectDate(input.date)
        else await load()
      } finally {
        setSaving(false)
      }
    },
    [actorId, actorName, dateId, load, selectDate],
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
    async (from, to) => {
      const range = normalizeDateRange(from, to)
      setExporting(true)
      try {
        const [rangeEvents, rangeNotes] = await Promise.all([
          listEventsInRange(range.from, range.to),
          listNotesInRange(range.from, range.to),
        ])
        await exportReportsPdf({
          from: range.from,
          to: range.to,
          events: rangeEvents,
          notes: rangeNotes,
          roster,
        })
      } finally {
        setExporting(false)
      }
    },
    [roster],
  )

  return {
    dateId,
    selectDate,
    roster,
    grantPeople,
    allowedUserIds: reportAllowedUserIds,
    events,
    notes,
    loading,
    dayLoading,
    saving,
    exporting,
    error,
    reload: load,
    saveEvent,
    removeEvent,
    saveNote,
    removeNote,
    setPersonAccess,
    exportRange,
  }
}
