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
import { SevaViewPage } from './pages/SevaViewPage'
import { AllMenusPage } from './pages/AllMenusPage'
import './App.css'

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
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
            <Route path="seva" element={<SevaViewPage />} />
            <Route
              path="admin/planning"
              element={
                <ProtectedRoute adminOnly>
                  <AdminMenuPlanningPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/catalog"
              element={
                <ProtectedRoute adminOnly>
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
                <ProtectedRoute adminOnly>
                  <AdminSevaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/users"
              element={
                <ProtectedRoute adminOnly>
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
