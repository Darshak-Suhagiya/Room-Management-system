import { matchPath } from 'react-router-dom'
import {
  getDefaultBottomNavIds,
  resolveTabsFromIds,
} from './appNavRegistry'

/**
 * Bottom-nav tab registry — shared by BottomNav and MobileTabCache.
 */
export function getBottomNavTabs(auth, preferences = null) {
  const ids = preferences?.isCustomizable
    ? preferences.tabIds
    : getDefaultBottomNavIds(auth)

  return resolveTabsFromIds(ids, auth)
}

export function matchBottomNavTab(tabs, pathname) {
  return tabs.find((tab) =>
    matchPath({ path: tab.path, end: tab.end ?? false }, pathname),
  )
}

export function isBottomNavRoute(tabs, pathname) {
  return Boolean(matchBottomNavTab(tabs, pathname))
}
