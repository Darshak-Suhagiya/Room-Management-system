import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { isUserApproved } from '../services/userService'

export function VerifyEmailPage() {
  const {
    user,
    profile,
    loading,
    logout,
    sendVerificationEmail,
    reloadAuthUser,
    refreshProfile,
    formatAuthError,
    needsEmailVerification,
    isAdmin,
  } = useAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="auth-page pt-safe pb-safe">
        <p className="page-loading">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.emailVerified) {
    if (profile?.status === 'pending' && profile?.role !== 'admin') {
      return <Navigate to="/account/pending" replace />
    }
    if (isUserApproved(profile) || isAdmin) {
      return <Navigate to="/" replace />
    }
  }

  if (!needsEmailVerification && !isAdmin) {
    return <Navigate to="/" replace />
  }

  const handleResend = async () => {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      await sendVerificationEmail()
      setMessage('Verification email sent. Check your inbox and spam folder.')
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  const handleCheck = async () => {
    setError('')
    setMessage('')
    setBusy(true)
    try {
      const updated = await reloadAuthUser()
      const refreshed = await refreshProfile()
      if (updated?.emailVerified) {
        setMessage('Email verified! Redirecting…')
        const p = refreshed ?? profile
        if (p?.status === 'pending' && p?.role !== 'admin') {
          window.location.href = '/account/pending'
        } else {
          window.location.href = '/'
        }
        return
      }
      setError('Email not verified yet. Open the link in the email we sent you.')
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page pt-safe pb-safe">
      <div className="auth-card account-status-card">
        <h1>Verify your email</h1>
        <p className="subtitle">
          We sent a verification link to <strong>{user.email}</strong>. Open
          that link in your email, then return here and tap the button below.
        </p>
        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <div className="account-status-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={handleCheck}
          >
            I verified my email
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={handleResend}
          >
            Resend email
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => logout()}
          >
            Sign out
          </button>
        </div>
        <Link to="/login" className="text-link">
          Back to sign in
        </Link>
        <div className="auth-theme-row">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
