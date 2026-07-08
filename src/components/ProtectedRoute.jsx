import { Navigate } from 'react-router-dom'
import { canAccessVoteDashboard } from '../config/rolePermissions'
import { useAuth } from '../contexts/AuthContext'
import { isUserApproved } from '../services/userService'

export function ProtectedRoute({
  children,
  adminOnly = false,
  voteDashboardAccess = false,
}) {
  const { user, profile, loading, isConfigured, needsEmailVerification } =
    useAuth()

  if (!isConfigured) {
    return <Navigate to="/setup" replace />
  }

  if (loading) {
    return (
      <div className="page-loading">
        <p>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (needsEmailVerification) {
    return <Navigate to="/account/verify-email" replace />
  }

  if (profile?.status === 'pending' && profile?.role !== 'admin') {
    return <Navigate to="/account/pending" replace />
  }

  if (!isUserApproved(profile) && profile?.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  if (voteDashboardAccess && !canAccessVoteDashboard(profile)) {
    return <Navigate to="/" replace />
  }

  return children
}
