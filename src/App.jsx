import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { SetupPage } from './pages/SetupPage'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { AccountPendingPage } from './pages/AccountPendingPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { AuthActionPage } from './pages/AuthActionPage'
import { AuthQueryRedirect } from './components/AuthQueryRedirect'

const AdminMenuPlanningPage = lazy(() =>
  import('./pages/AdminMenuPlanningPage').then((m) => ({
    default: m.AdminMenuPlanningPage,
  })),
)
const AdminMenuCatalogPage = lazy(() =>
  import('./pages/AdminMenuCatalogPage').then((m) => ({
    default: m.AdminMenuCatalogPage,
  })),
)
const AdminVotesDashboardPage = lazy(() =>
  import('./pages/AdminVotesDashboardPage').then((m) => ({
    default: m.AdminVotesDashboardPage,
  })),
)
const AdminUsersPage = lazy(() =>
  import('./pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
)
const AdminSevaPage = lazy(() =>
  import('./pages/AdminSevaPage').then((m) => ({ default: m.AdminSevaPage })),
)
const SevaOverviewPage = lazy(() =>
  import('./pages/SevaOverviewPage').then((m) => ({
    default: m.SevaOverviewPage,
  })),
)
const SevaPrintablePage = lazy(() =>
  import('./pages/SevaPrintablePage').then((m) => ({
    default: m.SevaPrintablePage,
  })),
)
const AllMenusPage = lazy(() =>
  import('./pages/AllMenusPage').then((m) => ({ default: m.AllMenusPage })),
)
const MenuAnalyticsPage = lazy(() =>
  import('./pages/MenuAnalyticsPage').then((m) => ({
    default: m.MenuAnalyticsPage,
  })),
)
const LeaveCalendarPage = lazy(() =>
  import('./pages/LeaveCalendarPage').then((m) => ({
    default: m.LeaveCalendarPage,
  })),
)
const AdminNoticesPage = lazy(() =>
  import('./pages/AdminNoticesPage').then((m) => ({
    default: m.AdminNoticesPage,
  })),
)
const AdminPushPage = lazy(() =>
  import('./pages/AdminPushPage').then((m) => ({ default: m.AdminPushPage })),
)
const StocksPage = lazy(() =>
  import('./pages/StocksPage').then((m) => ({ default: m.StocksPage })),
)
const ShoppingPage = lazy(() =>
  import('./pages/ShoppingPage').then((m) => ({ default: m.ShoppingPage })),
)

function RouteFallback() {
  return <p className="page-loading">Loading…</p>
}

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter
        basename={
          import.meta.env.BASE_URL.endsWith('/')
            ? import.meta.env.BASE_URL.slice(0, -1) || undefined
            : import.meta.env.BASE_URL || undefined
        }
      >
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account/pending" element={<AccountPendingPage />} />
          <Route path="/account/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/action" element={<AuthActionPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="menus" element={<AllMenusPage />} />
            <Route path="leaves" element={<LeaveCalendarPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="admin/notices"
              element={
                <ProtectedRoute noticesAccess>
                  <AdminNoticesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/push"
              element={
                <ProtectedRoute pushAccess>
                  <AdminPushPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <ProtectedRoute menuAnalyticsAccess>
                  <MenuAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route path="seva" element={<SevaOverviewPage />} />
            <Route
              path="stocks"
              element={
                <ProtectedRoute stocksAccess>
                  <StocksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="shopping"
              element={
                <ProtectedRoute stocksAccess>
                  <ShoppingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/planning"
              element={
                <ProtectedRoute menuPlanningAccess>
                  <AdminMenuPlanningPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/catalog"
              element={
                <ProtectedRoute menuCatalogAccess>
                  <AdminMenuCatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/votes"
              element={
                <ProtectedRoute voteDashboardAccess>
                  <AdminVotesDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/seva"
              element={
                <ProtectedRoute sevaManageAccess>
                  <AdminSevaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/seva-printable"
              element={
                <ProtectedRoute sevaManageAccess>
                  <SevaPrintablePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute usersAccess>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/menu"
              element={<Navigate to="/admin/planning" replace />}
            />
          </Route>
          <Route path="*" element={<AuthQueryRedirect />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
