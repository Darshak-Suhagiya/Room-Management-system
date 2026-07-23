import { lazy } from 'react'
import {
  BarChart3,
  Bell,
  CalendarDays,
  CalendarOff,
  LayoutGrid,
  ListChecks,
  Megaphone,
  Package,
  Printer,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  UtensilsCrossed,
} from 'lucide-react'

export const MEALS_TAB_ID = 'meals'
export const VOTES_TAB_ID = 'votes'

const lazyPage = (importFn) => lazy(importFn)

const NAV_COMPONENTS = {
  meals: lazyPage(() =>
    import('../pages/HomePage').then((m) => ({ default: m.HomePage })),
  ),
  seva: lazyPage(() =>
    import('../pages/SevaOverviewPage').then((m) => ({
      default: m.SevaOverviewPage,
    })),
  ),
  leaves: lazyPage(() =>
    import('../pages/LeaveCalendarPage').then((m) => ({
      default: m.LeaveCalendarPage,
    })),
  ),
  stocks: lazyPage(() =>
    import('../pages/StocksPage').then((m) => ({ default: m.StocksPage })),
  ),
  shopping: lazyPage(() =>
    import('../pages/ShoppingPage').then((m) => ({ default: m.ShoppingPage })),
  ),
  votes: lazyPage(() =>
    import('../pages/AdminVotesDashboardPage').then((m) => ({
      default: m.AdminVotesDashboardPage,
    })),
  ),
  settings: lazyPage(() =>
    import('../pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
  ),
  'menu-planning': lazyPage(() =>
    import('../pages/AdminMenuPlanningPage').then((m) => ({
      default: m.AdminMenuPlanningPage,
    })),
  ),
  'menu-catalog': lazyPage(() =>
    import('../pages/AdminMenuCatalogPage').then((m) => ({
      default: m.AdminMenuCatalogPage,
    })),
  ),
  users: lazyPage(() =>
    import('../pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
  ),
  notices: lazyPage(() =>
    import('../pages/AdminNoticesPage').then((m) => ({
      default: m.AdminNoticesPage,
    })),
  ),
  push: lazyPage(() =>
    import('../pages/AdminPushPage').then((m) => ({ default: m.AdminPushPage })),
  ),
  'seva-admin': lazyPage(() =>
    import('../pages/AdminSevaPage').then((m) => ({ default: m.AdminSevaPage })),
  ),
  'seva-printable': lazyPage(() =>
    import('../pages/SevaPrintablePage').then((m) => ({
      default: m.SevaPrintablePage,
    })),
  ),
}

/** Default bottom-nav ids (excludes settings and manage-group pages). */
const DEFAULT_BOTTOM_NAV_IDS = [
  'meals',
  'votes',
  'seva',
  'leaves',
  'stocks',
  'shopping',
]

const NAV_DEFS = [
  {
    id: 'meals',
    path: '/',
    end: true,
    sidebarLabel: 'My Meals',
    navLabel: 'Meals',
    icon: UtensilsCrossed,
    group: 'main',
    guard: null,
    inDefaultNav: true,
    isVisible: (auth) => !auth.isMaharaj,
  },
  {
    id: 'seva',
    path: '/seva',
    end: false,
    sidebarLabel: 'Room Seva',
    navLabel: 'Seva',
    icon: Sparkles,
    group: 'main',
    guard: null,
    inDefaultNav: true,
    isVisible: (auth) => !auth.isMaharaj,
  },
  {
    id: 'leaves',
    path: '/leaves',
    end: false,
    sidebarLabel: 'Leave calendar',
    navLabel: 'Leave',
    icon: CalendarOff,
    group: 'main',
    guard: null,
    inDefaultNav: true,
    isVisible: () => true,
  },
  {
    id: 'stocks',
    path: '/stocks',
    end: false,
    sidebarLabel: 'Stocks',
    navLabel: 'Stocks',
    icon: Package,
    group: 'main',
    guard: 'stocksAccess',
    inDefaultNav: true,
    isVisible: (auth) => auth.canViewStocks,
  },
  {
    id: 'shopping',
    path: '/shopping',
    end: false,
    sidebarLabel: 'Shopping',
    navLabel: 'Shop',
    icon: ShoppingCart,
    group: 'main',
    guard: 'stocksAccess',
    inDefaultNav: true,
    isVisible: (auth) => auth.canViewStocks,
  },
  {
    id: 'votes',
    path: '/admin/votes',
    end: false,
    sidebarLabel: 'Vote Dashboard',
    navLabel: 'Votes',
    icon: BarChart3,
    group: 'main',
    guard: 'voteDashboardAccess',
    inDefaultNav: true,
    isVisible: (auth) => auth.canAccessVoteDashboard,
  },
  {
    id: 'settings',
    path: '/settings',
    end: false,
    sidebarLabel: 'Settings',
    navLabel: 'Settings',
    icon: Settings,
    group: 'main',
    guard: null,
    inDefaultNav: false,
    isVisible: () => true,
  },
  {
    id: 'menu-planning',
    path: '/admin/planning',
    end: false,
    sidebarLabel: 'Menu Planning',
    navLabel: 'Plan',
    icon: CalendarDays,
    group: 'manage',
    guard: 'menuPlanningAccess',
    inDefaultNav: false,
    isVisible: (auth) => auth.canPlanMenus,
  },
  {
    id: 'menu-catalog',
    path: '/admin/catalog',
    end: false,
    sidebarLabel: 'Menu Editing',
    navLabel: 'Catalog',
    icon: ListChecks,
    group: 'manage',
    guard: 'menuCatalogAccess',
    inDefaultNav: false,
    isVisible: (auth) => auth.canEditMenuCatalog,
  },
  {
    id: 'users',
    path: '/admin/users',
    end: false,
    sidebarLabel: 'Users',
    navLabel: 'Users',
    icon: Users,
    group: 'manage',
    guard: 'usersAccess',
    inDefaultNav: false,
    isVisible: (auth) => auth.canManageUsers,
  },
  {
    id: 'notices',
    path: '/admin/notices',
    end: false,
    sidebarLabel: 'Notices',
    navLabel: 'Notices',
    icon: Megaphone,
    group: 'manage',
    guard: 'noticesAccess',
    inDefaultNav: false,
    isVisible: (auth) => auth.canManageNotices || auth.canViewNoticeAnalytics,
  },
  {
    id: 'push',
    path: '/admin/push',
    end: false,
    sidebarLabel: 'Push notifications',
    navLabel: 'Push',
    icon: Bell,
    group: 'manage',
    guard: 'pushAccess',
    inDefaultNav: false,
    isVisible: (auth) => auth.canManagePush,
  },
  {
    id: 'seva-admin',
    path: '/admin/seva',
    end: false,
    sidebarLabel: 'Seva Admin',
    navLabel: 'Seva Admin',
    icon: LayoutGrid,
    group: 'manage',
    guard: 'sevaManageAccess',
    inDefaultNav: false,
    isVisible: (auth) => auth.canManageSeva,
  },
  {
    id: 'seva-printable',
    path: '/admin/seva-printable',
    end: false,
    sidebarLabel: 'Room Seva Printable',
    navLabel: 'Print',
    icon: Printer,
    group: 'manage',
    guard: 'sevaManageAccess',
    inDefaultNav: false,
    isVisible: (auth) => auth.canManageSeva,
  },
]

export const ALL_NAV_PATHS = NAV_DEFS.map((def) => def.path)

export const NAV_GUARD_PROPS = {
  voteDashboardAccess: { voteDashboardAccess: true },
  stocksAccess: { stocksAccess: true },
  menuPlanningAccess: { menuPlanningAccess: true },
  menuCatalogAccess: { menuCatalogAccess: true },
  usersAccess: { usersAccess: true },
  sevaManageAccess: { sevaManageAccess: true },
  noticesAccess: { noticesAccess: true },
  pushAccess: { pushAccess: true },
}

export function buildAuthSnapshot({
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
}) {
  return {
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
  }
}

function filterVisibleDefs(auth) {
  return NAV_DEFS.filter((def) => def.isVisible(auth))
}

export function getNavPool(auth) {
  return filterVisibleDefs(auth)
}

export function getSidebarSections(auth) {
  const visible = filterVisibleDefs(auth)
  return {
    main: visible
      .filter((def) => def.group === 'main')
      .map(toSidebarLink),
    manage: visible
      .filter((def) => def.group === 'manage')
      .map(toSidebarLink),
  }
}

function toSidebarLink(def) {
  return {
    to: def.path,
    end: def.end ?? false,
    label: def.sidebarLabel,
    icon: def.icon,
  }
}

function toTabObject(def) {
  return {
    id: def.id,
    path: def.path,
    end: def.end ?? false,
    label: def.navLabel,
    sidebarLabel: def.sidebarLabel,
    icon: def.icon,
    component: NAV_COMPONENTS[def.id],
    guard: def.guard,
    group: def.group,
  }
}

export function getDefaultBottomNavIds(auth) {
  const pool = getNavPool(auth)
  const poolIds = new Set(pool.map((def) => def.id))
  const ids = []

  for (const id of DEFAULT_BOTTOM_NAV_IDS) {
    if (poolIds.has(id)) ids.push(id)
    if (ids.length >= 5) break
  }

  if (ids.length > 0) return ids
  return pool.slice(0, Math.min(5, pool.length)).map((def) => def.id)
}

export function getRequiredTabId(auth) {
  const pool = getNavPool(auth)
  const poolIds = new Set(pool.map((def) => def.id))

  if (poolIds.has(MEALS_TAB_ID)) return MEALS_TAB_ID
  if (poolIds.has(VOTES_TAB_ID)) return VOTES_TAB_ID
  return pool[0]?.id ?? null
}

export function getBottomNavLimits(auth) {
  const poolSize = getNavPool(auth).length
  return {
    minTabs: Math.min(3, poolSize),
    maxTabs: Math.min(5, poolSize),
    poolSize,
  }
}

export function getHomeTabPath(auth) {
  const requiredId = getRequiredTabId(auth)
  if (!requiredId) return '/'
  const def = NAV_DEFS.find((d) => d.id === requiredId)
  return def?.path ?? '/'
}

export function resolveTabsFromIds(ids, auth) {
  const pool = getNavPool(auth)
  const byId = new Map(pool.map((def) => [def.id, def]))
  const seen = new Set()

  return ids
    .filter((id) => {
      if (!byId.has(id) || seen.has(id)) return false
      seen.add(id)
      return true
    })
    .map((id) => toTabObject(byId.get(id)))
}

export function getNavDefById(id) {
  return NAV_DEFS.find((def) => def.id === id) ?? null
}
