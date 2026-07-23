import { isStandaloneDisplay } from '../services/pushTokenService'
import {
  getDefaultBottomNavIds,
  getNavPool,
  getRequiredTabId,
  getBottomNavLimits,
} from '../config/appNavRegistry'

export const BOTTOM_NAV_STORAGE_KEY = 'rm-bottom-nav-tabs'
const STORAGE_VERSION = 1

function uniqueIds(ids) {
  const seen = new Set()
  return ids.filter((id) => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function ensureRequiredPresent(ids, auth) {
  const requiredId = getRequiredTabId(auth)
  if (!requiredId || ids.includes(requiredId)) return ids
  return [requiredId, ...ids]
}

function backfillToMinimum(ids, auth, minTabs) {
  const poolIds = getNavPool(auth).map((def) => def.id)
  const result = [...ids]
  const present = new Set(result)

  for (const id of poolIds) {
    if (result.length >= minTabs) break
    if (!present.has(id)) {
      result.push(id)
      present.add(id)
    }
  }

  return result
}

export function sanitizeBottomNavTabIds(rawIds, auth) {
  const { minTabs, maxTabs } = getBottomNavLimits(auth)
  const poolIds = new Set(getNavPool(auth).map((def) => def.id))
  const requiredId = getRequiredTabId(auth)

  let ids = uniqueIds(rawIds).filter((id) => poolIds.has(id))
  ids = ensureRequiredPresent(ids, auth)

  if (ids.length > maxTabs) {
    const required = requiredId ? ids.filter((id) => id === requiredId) : []
    const rest = ids.filter((id) => id !== requiredId).slice(0, maxTabs - required.length)
    ids = [...required, ...rest]
  }

  if (ids.length < minTabs) {
    ids = backfillToMinimum(ids, auth, minTabs)
  }

  if (ids.length < minTabs) {
    return getDefaultBottomNavIds(auth)
  }

  return ids
}

export function loadBottomNavPreferences(auth) {
  if (!isStandaloneDisplay()) return null

  const defaults = getDefaultBottomNavIds(auth)

  try {
    const raw = localStorage.getItem(BOTTOM_NAV_STORAGE_KEY)
    if (!raw) return defaults

    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.tabIds)) return defaults

    return sanitizeBottomNavTabIds(parsed.tabIds, auth)
  } catch {
    return defaults
  }
}

export function saveBottomNavPreferences(tabIds) {
  if (!isStandaloneDisplay()) return

  try {
    localStorage.setItem(
      BOTTOM_NAV_STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, tabIds }),
    )
  } catch {
    // ignore quota / private mode
  }
}

export function isBottomNavCustomizable(auth) {
  return isStandaloneDisplay() && getNavPool(auth).length > 3
}
