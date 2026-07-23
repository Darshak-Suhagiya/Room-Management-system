import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu as MenuIcon, Settings, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useBottomNavPreferences } from '../contexts/BottomNavPreferencesContext'
import { PushNotificationProvider } from '../contexts/PushNotificationContext'
import { BottomNav } from './BottomNav'
import { MobileTabCache } from './mobile/MobileTabCache'
import { getBottomNavTabs, isBottomNavRoute } from '../config/bottomNavTabs'
import {
  ALL_NAV_PATHS,
  buildAuthSnapshot,
  getHomeTabPath,
  getSidebarSections,
  resolveTabsFromIds,
} from '../config/appNavRegistry'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { getRoleLabel, getUserInitials } from '../utils/userDisplay'
import { listActiveNotices } from '../services/noticeService'

export function Layout() {
  const authFromContext = useAuth()
  const {
    profile,
    logout,
    isMaharaj,
    canAccessVoteDashboard,
    canPlanMenus,
    canEditMenuCatalog,
    canManageUsers,
    canManageSeva,
    canManageNotices,
    canViewNoticeAnalytics,
    canManagePush,
    canViewStocks,
  } = authFromContext

  const auth = useMemo(
    () =>
      buildAuthSnapshot({
        isMaharaj,
        canAccessVoteDashboard,
        canPlanMenus,
        canEditMenuCatalog,
        canManageUsers,
        canManageSeva,
        canManageNotices,
        canViewNoticeAnalytics,
        canManagePush,
        canViewStocks,
      }),
    [
      isMaharaj,
      canAccessVoteDashboard,
      canPlanMenus,
      canEditMenuCatalog,
      canManageUsers,
      canManageSeva,
      canManageNotices,
      canViewNoticeAnalytics,
      canManagePush,
      canViewStocks,
    ],
  )

  const { isCustomizable, tabIds } = useBottomNavPreferences()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobileLayout = useMediaQuery('(max-width: 899px)')
  const homeTabPath = useMemo(() => getHomeTabPath(auth), [auth])
  const prevTabIdsRef = useRef(tabIds)

  const bottomNavTabs = useMemo(
    () => getBottomNavTabs(auth, { isCustomizable, tabIds }),
    [auth, isCustomizable, tabIds],
  )

  const showMobileTabCache =
    isMobileLayout && isBottomNavRoute(bottomNavTabs, location.pathname)

  useEffect(() => {
    const prevTabIds = prevTabIdsRef.current
    if (prevTabIds === tabIds) return
    prevTabIdsRef.current = tabIds

    if (!isMobileLayout || !isCustomizable) return
    if (!ALL_NAV_PATHS.includes(location.pathname)) return
    if (isBottomNavRoute(bottomNavTabs, location.pathname)) return

    const prevPaths = resolveTabsFromIds(prevTabIds, auth).map((tab) => tab.path)
    if (prevPaths.includes(location.pathname)) {
      navigate(homeTabPath, { replace: true })
    }
  }, [
    tabIds,
    bottomNavTabs,
    auth,
    isMobileLayout,
    isCustomizable,
    location.pathname,
    homeTabPath,
    navigate,
  ])

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const scrimRef = useRef(null)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!profile?.id) return undefined
    let cancelled = false
    listActiveNotices().catch((err) => {
      if (!cancelled) console.error('prefetch notices', err)
    })
    return () => {
      cancelled = true
    }
  }, [profile?.id])

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [sidebarOpen])

  useEffect(() => {
    document.documentElement.classList.add('app-shell-active')
    return () => document.documentElement.classList.remove('app-shell-active')
  }, [])

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen)
    return () => document.body.classList.remove('sidebar-open')
  }, [sidebarOpen])

  const roleLabel = getRoleLabel(profile)
  const initials = getUserInitials(profile?.displayName, profile?.email)

  const { main: mainLinks, manage: manageLinks } = useMemo(
    () => getSidebarSections(auth),
    [auth],
  )

  const renderLink = ({ to, end, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
    >
      <Icon size={19} className="side-link-icon" />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <PushNotificationProvider>
      <div className="app-layout">
        <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <div className="sidebar-brand">
            <span className="brand-mark">RM</span>
            <div className="brand-text">
              <h1>Room Management</h1>
              <p className="brand-subtitle">Meal Planner &amp; Tracker</p>
            </div>
            <button
              type="button"
              className="sidebar-close touch-target inline-flex items-center justify-center md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Main">
            <p className="sidebar-section-label">Main</p>
            {mainLinks.map(renderLink)}

            {manageLinks.length > 0 && (
              <>
                <p className="sidebar-section-label">Manage</p>
                {manageLinks.map(renderLink)}
              </>
            )}
          </nav>

          <div className="sidebar-footer pb-safe">
            <div className="sidebar-user">
              <span className="user-avatar" aria-hidden>
                {initials}
              </span>
              <div className="user-meta">
                <span className="user-name">{profile?.displayName ?? 'User'}</span>
                {roleLabel && <span className="user-role">{roleLabel}</span>}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon-only sidebar-signout touch-target"
              onClick={() => logout()}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            ref={scrimRef}
            className="sidebar-scrim"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        <div className="app-content">
          <header className="topbar">
            <button
              type="button"
              className="topbar-menu-btn touch-target inline-flex items-center justify-center"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <MenuIcon size={22} />
            </button>
            <Link to={homeTabPath} className="topbar-brand">
              <span className="brand-mark brand-mark-sm">RM</span>
              <span>Room Management</span>
            </Link>
            <div className="topbar-actions">
              <Link
                to="/settings"
                className="topbar-settings-btn touch-target inline-flex items-center justify-center"
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={22} />
              </Link>
            </div>
          </header>

          <main className="app-main">
            {showMobileTabCache ? (
              <MobileTabCache
                activePath={location.pathname}
                tabs={bottomNavTabs}
              />
            ) : (
              <Outlet />
            )}
          </main>

          <div id="mobile-action-portal" className="mobile-action-portal" />

          <BottomNav />
        </div>
      </div>
    </PushNotificationProvider>
  )
}
