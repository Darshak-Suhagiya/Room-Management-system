import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { SetupPage } from './pages/SetupPage'
import { HomePage } from './pages/HomePage'
import { AdminMenuPlanningPage } from './pages/AdminMenuPlanningPage'
import { AdminMenuCatalogPage } from './pages/AdminMenuCatalogPage'
import { AdminVotesDashboardPage } from './pages/AdminVotesDashboardPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AccountPendingPage } from './pages/AccountPendingPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { AuthActionPage } from './pages/AuthActionPage'
import { AuthQueryRedirect } from './components/AuthQueryRedirect'
import { AdminSevaPage } from './pages/AdminSevaPage'
import { SevaOverviewPage } from './pages/SevaOverviewPage'
import { SevaPrintablePage } from './pages/SevaPrintablePage'
import { AllMenusPage } from './pages/AllMenusPage'
import { MenuAnalyticsPage } from './pages/MenuAnalyticsPage'
import { LeaveCalendarPage } from './pages/LeaveCalendarPage'
import { AdminNoticesPage } from './pages/AdminNoticesPage'
import { AdminPushPage } from './pages/AdminPushPage'
import './App.css'

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
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
