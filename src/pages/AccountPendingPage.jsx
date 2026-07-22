import { useEffect } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { isUserApproved } from '../services/userService'

export function AccountPendingPage() {
  const { user, profile, logout, refreshProfile, loading, needsEmailVerification } =
    useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (profile && isUserApproved(profile)) {
      navigate('/', { replace: true })
    }
  }, [profile, navigate])

  if (loading) {
    return <p className="page-loading">Loading…</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (needsEmailVerification) {
    return <Navigate to="/account/verify-email" replace />
  }

  return (
    <div className="page account-status-page pt-safe pb-safe">
      <div className="account-status-card">
        <h2>Account pending approval</h2>
        <p>
          Hello <strong>{profile?.displayName ?? profile?.email}</strong>, your
          registration was received. You cannot vote or use menus until an admin
          approves your account.
        </p>
        <p className="muted">After approval, click Check status.</p>
        <div className="account-status-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => refreshProfile()}
          >
            Check status
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => logout()}>
            Sign out
          </button>
        </div>
        <Link to="/login" className="text-link">
          Back to login
        </Link>
        <div className="auth-theme-row">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
