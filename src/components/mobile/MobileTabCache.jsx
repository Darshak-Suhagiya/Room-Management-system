import { Suspense, useEffect, useState } from 'react'
import { ProtectedRoute } from '../ProtectedRoute'
import { matchBottomNavTab } from '../../config/bottomNavTabs'
import { NAV_GUARD_PROPS } from '../../config/appNavRegistry'
import { MobileTabPanelProvider } from '../../contexts/MobileTabPanelContext'
import { MobilePageSkeleton } from './MobilePageSkeleton'

function TabPanel({ tab, children }) {
  if (!tab.guard) return children

  const guardProps = NAV_GUARD_PROPS[tab.guard]
  if (!guardProps) return children

  return <ProtectedRoute {...guardProps}>{children}</ProtectedRoute>
}

/**
 * Keep selected bottom-nav screens mounted on mobile so tab switches do not remount pages.
 * Only tabs in the active bottom-nav set are eligible for caching.
 */
export function MobileTabCache({ activePath, tabs }) {
  const [mountedPaths, setMountedPaths] = useState(() => {
    const initial = matchBottomNavTab(tabs, activePath)
    return initial ? [initial.path] : []
  })

  useEffect(() => {
    const active = matchBottomNavTab(tabs, activePath)
    if (!active) return
    setMountedPaths((prev) =>
      prev.includes(active.path) ? prev : [...prev, active.path],
    )
  }, [activePath, tabs])

  useEffect(() => {
    const allowed = new Set(tabs.map((tab) => tab.path))
    setMountedPaths((prev) => prev.filter((path) => allowed.has(path)))
  }, [tabs])

  return (
    <div className="mobile-tab-cache">
      {tabs.map((tab) => {
        if (!mountedPaths.includes(tab.path)) return null
        const isActive = Boolean(matchBottomNavTab([tab], activePath))
        const Component = tab.component

        return (
          <div
            key={tab.path}
            className="mobile-tab-panel"
            hidden={!isActive}
            aria-hidden={!isActive}
          >
            <TabPanel tab={tab}>
              <MobileTabPanelProvider isActive={isActive}>
                <Suspense fallback={<MobilePageSkeleton />}>
                  <Component />
                </Suspense>
              </MobileTabPanelProvider>
            </TabPanel>
          </div>
        )
      })}
    </div>
  )
}
