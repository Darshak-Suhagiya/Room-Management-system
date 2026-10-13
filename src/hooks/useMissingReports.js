import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { listAllEvents, listResponsesForUser } from '../services/reportService'
import { formatDateId } from '../utils/mealDateUtils'
import {
  buildReportBoard,
  findMealReportBlock,
  indexResponses,
  mealReportGraceDays,
} from '../utils/reportAttendance'

const EMPTY = { items: [], blockingItems: [], graceDays: 0 }

export function useMissingReports() {
  const { user, isMaharaj, isObserver } = useAuth()
  const [state, setState] = useState(EMPTY)

  const loadItems = useCallback(async () => {
    if (!user?.uid || isMaharaj || isObserver) return EMPTY
    try {
      const [events, responses] = await Promise.all([
        listAllEvents(),
        listResponsesForUser(user.uid),
      ])
      const responseMap = indexResponses(events, responses)
      const today = formatDateId(new Date())
      const board = buildReportBoard({
        events,
        responseMap,
        userId: user.uid,
        today,
      })
      const block = findMealReportBlock({
        events,
        responseMap,
        userId: user.uid,
        today,
      })
      return {
        items: board.missing,
        blockingItems: block?.missing ?? [],
        graceDays: block?.graceDays ?? mealReportGraceDays(events),
      }
    } catch {
      return EMPTY
    }
  }, [user, isMaharaj, isObserver])

  const reload = useCallback(async () => {
    const next = await loadItems()
    setState(next)
  }, [loadItems])

  useEffect(() => {
    let cancelled = false
    loadItems().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [loadItems])

  if (!user?.uid || isMaharaj || isObserver) return { ...EMPTY, reload }
  return { ...state, reload }
}
