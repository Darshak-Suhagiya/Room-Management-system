import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subscribeMealDefaults } from '../services/mealDefaultsService'
import { subscribeUserParticipations } from '../services/participationService'
import { subscribeVoteLocksFromDate } from '../services/voteLockService'
import { formatDateId } from '../utils/mealDateUtils'
import { findDefaultsGate } from '../utils/mealDefaultsUtils'
import { getPlannedMenuItems, hasMealVoteComplete } from '../utils/menuVoteUtils'

const NO_GATE = { items: [], count: 0 }

/**
 * Member's default-vote settings plus the list of planned dishes (on open
 * menus whose day resolves to Eating) that still have no default vote.
 * While that list is not empty, voting in My Meals is blocked.
 */
export function useDefaultsGate({ menus, catalog, enabled = true }) {
  const { user } = useAuth()
  const uid = user?.uid
  const today = formatDateId(new Date())
  const [defaults, setDefaults] = useState(null)
  const [locks, setLocks] = useState({})
  const [participations, setParticipations] = useState([])

  useEffect(() => {
    if (!uid || !enabled) return undefined
    return subscribeMealDefaults(uid, setDefaults)
  }, [uid, enabled])

  useEffect(() => {
    if (!uid || !enabled) return undefined
    return subscribeVoteLocksFromDate(today, setLocks)
  }, [uid, enabled, today])

  useEffect(() => {
    if (!uid || !enabled) return undefined
    return subscribeUserParticipations(uid, setParticipations, {
      fromDateId: today,
    })
  }, [uid, enabled, today])

  const participationByKey = useMemo(() => {
    const map = {}
    for (const p of participations) map[`${p.date}_${p.slot}`] = p
    return map
  }, [participations])

  const isSlotAnswered = useCallback(
    (menu, slot) =>
      hasMealVoteComplete(
        participationByKey[`${menu.date}_${slot}`],
        getPlannedMenuItems(menu, slot, catalog),
      ),
    [participationByKey, catalog],
  )

  const gate = useMemo(() => {
    if (!enabled || !defaults || !catalog?.categories) return NO_GATE
    return findDefaultsGate({
      menus,
      catalog,
      defaults,
      locks,
      today,
      isSlotAnswered,
    })
  }, [enabled, defaults, catalog, menus, locks, today, isSlotAnswered])

  return {
    defaults,
    defaultsReady: Boolean(defaults),
    gate,
    locks,
    blocked: gate.count > 0,
  }
}
