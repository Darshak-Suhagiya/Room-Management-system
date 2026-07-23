import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import {
  buildAuthSnapshot,
  getDefaultBottomNavIds,
  getNavPool,
  getRequiredTabId,
  getBottomNavLimits,
} from '../config/appNavRegistry'
import {
  isBottomNavCustomizable,
  loadBottomNavPreferences,
  saveBottomNavPreferences,
  sanitizeBottomNavTabIds,
} from '../utils/bottomNavPreferences'

const BottomNavPreferencesContext = createContext(null)

export function BottomNavPreferencesProvider({ children }) {
  const authFromContext = useAuth()
  const auth = useMemo(
    () => buildAuthSnapshot(authFromContext),
    [
      authFromContext.isMaharaj,
      authFromContext.canAccessVoteDashboard,
      authFromContext.canPlanMenus,
      authFromContext.canEditMenuCatalog,
      authFromContext.canManageUsers,
      authFromContext.canManageSeva,
      authFromContext.canManageNotices,
      authFromContext.canViewNoticeAnalytics,
      authFromContext.canManagePush,
      authFromContext.canViewStocks,
    ],
  )

  const limits = useMemo(() => getBottomNavLimits(auth), [auth])
  const isCustomizable = useMemo(() => isBottomNavCustomizable(auth), [auth])
  const requiredTabId = useMemo(() => getRequiredTabId(auth), [auth])

  const [tabIds, setTabIdsState] = useState(() => {
    if (isCustomizable) {
      return loadBottomNavPreferences(auth) ?? getDefaultBottomNavIds(auth)
    }
    return getNavPool(auth).map((def) => def.id)
  })

  useEffect(() => {
    if (isCustomizable) {
      setTabIdsState(
        loadBottomNavPreferences(auth) ?? getDefaultBottomNavIds(auth),
      )
    } else {
      setTabIdsState(getNavPool(auth).map((def) => def.id))
    }
  }, [isCustomizable, auth])

  const availableTabs = useMemo(() => {
    return getNavPool(auth).map((def) => ({
      id: def.id,
      sidebarLabel: def.sidebarLabel,
      navLabel: def.navLabel,
      label: def.sidebarLabel,
      icon: def.icon,
      group: def.group,
    }))
  }, [auth])

  const persist = useCallback(
    (nextIds) => {
      const sanitized = sanitizeBottomNavTabIds(nextIds, auth)
      setTabIdsState(sanitized)
      if (isCustomizable) {
        saveBottomNavPreferences(sanitized)
      }
      return sanitized
    },
    [auth, isCustomizable],
  )

  const setTabIds = useCallback(
    (nextIds) => {
      persist(nextIds)
    },
    [persist],
  )

  const toggleTab = useCallback(
    (id) => {
      if (id === requiredTabId) return

      const isOn = tabIds.includes(id)
      if (isOn) {
        if (tabIds.length <= limits.minTabs) return
        persist(tabIds.filter((tabId) => tabId !== id))
        return
      }
      if (tabIds.length >= limits.maxTabs) return
      persist([...tabIds, id])
    },
    [tabIds, persist, requiredTabId, limits.minTabs, limits.maxTabs],
  )

  const moveTab = useCallback(
    (id, direction) => {
      const index = tabIds.indexOf(id)
      if (index === -1) return

      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= tabIds.length) return

      const next = [...tabIds]
      ;[next[index], next[target]] = [next[target], next[index]]
      persist(next)
    },
    [tabIds, persist],
  )

  const resetToDefault = useCallback(() => {
    persist(getDefaultBottomNavIds(auth))
  }, [auth, persist])

  const value = useMemo(
    () => ({
      isCustomizable,
      tabIds,
      availableTabs,
      requiredTabId,
      setTabIds,
      toggleTab,
      moveTab,
      resetToDefault,
      minTabs: limits.minTabs,
      maxTabs: limits.maxTabs,
    }),
    [
      isCustomizable,
      tabIds,
      availableTabs,
      requiredTabId,
      setTabIds,
      toggleTab,
      moveTab,
      resetToDefault,
      limits.minTabs,
      limits.maxTabs,
    ],
  )

  return (
    <BottomNavPreferencesContext.Provider value={value}>
      {children}
    </BottomNavPreferencesContext.Provider>
  )
}

export function useBottomNavPreferences() {
  const ctx = useContext(BottomNavPreferencesContext)
  if (!ctx) {
    throw new Error(
      'useBottomNavPreferences must be used within BottomNavPreferencesProvider',
    )
  }
  return ctx
}
