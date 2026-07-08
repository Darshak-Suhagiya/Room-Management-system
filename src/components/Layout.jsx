import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu as MenuIcon,
  Sparkles,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ThemeSwitcher } from './ThemeSwitcher'
import { getRoleLabel, getUserInitials } from '../utils/userDisplay'

export function Layout() {
  const { profile, isAdmin, isMaharaj, canAccessVoteDashboard, logout } =
    useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const scrimRef = useRef(null)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [sidebarOpen])

  const roleLabel = getRoleLabel(profile, { isAdmin, isMaharaj })
  const initials = getUserInitials(profile?.displayName, profile?.email)

  const mainLinks = [
    !isMaharaj && { to: '/', end: true, label: 'My Meals', icon: UtensilsCrossed },
    !isMaharaj && { to: '/seva', label: 'Room Seva', icon: Sparkles },
    canAccessVoteDashboard && {
      to: '/admin/votes',
      label: 'Vote Dashboard',
      icon: BarChart3,
    },
  ].filter(Boolean)

  const manageLinks = isAdmin
    ? [
        { to: '/admin/planning', label: 'Menu Planning', icon: CalendarDays },
        { to: '/admin/catalog', label: 'Menu Editing', icon: ListChecks },
        { to: '/admin/users', label: 'Users', icon: Users },
        { to: '/admin/seva', label: 'Seva Admin', icon: LayoutGrid },
      ]
    : []

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
            className="sidebar-close"
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

        <div className="sidebar-footer">
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
            className="btn btn-ghost btn-icon-only sidebar-signout"
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
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon size={22} />
          </button>
          <Link to="/" className="topbar-brand">
            <span className="brand-mark brand-mark-sm">RM</span>
            <span>Room Management</span>
          </Link>
          <div className="topbar-actions">
            <ThemeSwitcher compact />
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
