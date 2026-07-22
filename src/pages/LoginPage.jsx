import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CalendarCheck, ShieldCheck, UtensilsCrossed, Vote } from 'lucide-react'
import { hasAuthActionParams } from '../lib/parseAuthActionParams'
import { useAuth } from '../contexts/AuthContext'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { ROLES } from '../config/constants'
import { getUserProfile, isUserApproved } from '../services/userService'

export function LoginPage() {
  const {
    login,
    register,
    resetPassword,
    user,
    profile,
    isConfigured,
    authNotice,
    clearAuthNotice,
    needsEmailVerification,
    formatAuthError,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authNotice === 'deactivated') {
      setError('Your account is deactivated. Contact an admin.')
      clearAuthNotice()
    }
  }, [authNotice, clearAuthNotice])

  if (hasAuthActionParams(new URLSearchParams(location.search))) {
    return (
      <Navigate
        to={{ pathname: '/auth/action', search: location.search }}
        replace
      />
    )
  }

  if (!isConfigured) {
    return <Navigate to="/setup" replace />
  }

  if (user && profile) {
    if (needsEmailVerification) {
      return <Navigate to="/account/verify-email" replace />
    }
    if (profile.status === 'pending' && profile.role !== 'admin') {
      return <Navigate to="/account/pending" replace />
    }
    if (isUserApproved(profile)) {
      return <Navigate to="/" replace />
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'forgot') {
        await resetPassword(email)
        setMessage('Password reset email sent. Check your inbox.')
        setMode('login')
      } else if (mode === 'register') {
        await register(email, password)
        navigate('/account/verify-email')
      } else {
        const cred = await login(email, password)
        if (!cred.user.emailVerified) {
          const p = await getUserProfile(cred.user.uid)
          if (p?.role !== ROLES.ADMIN) {
            navigate('/account/verify-email')
            return
          }
        }
        navigate('/')
      }
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const title =
    mode === 'forgot'
      ? 'Reset password'
      : mode === 'register'
        ? 'Create account'
        : 'Sign in'

  return (
    <div className="auth-split">
      <aside className="auth-brand">
        <div className="auth-brand-badge">
          <span className="auth-brand-logo">
            <UtensilsCrossed size={22} />
          </span>
          Room Management
        </div>
        <div className="auth-brand-hero">
          <h2>Plan meals, track seva, and vote — all in one place.</h2>
          <p>
            A calm, focused workspace for your kitchen and rooms. Sign in to see
            today&apos;s menu and cast your vote.
          </p>
          <ul className="auth-brand-points">
            <li>
              <CalendarCheck size={18} /> Daily meal planning &amp; menus
            </li>
            <li>
              <Vote size={18} /> Live meal voting &amp; dashboards
            </li>
            <li>
              <ShieldCheck size={18} /> Role-based access for admins &amp; maharaj
            </li>
          </ul>
        </div>
        <p className="auth-brand-foot">Meal Planner &amp; Participation Tracker</p>
      </aside>
      <div className="auth-panel pt-safe pb-safe">
      <div className="auth-card">
        <h1>Room Management</h1>
        <p className="subtitle">Meal Planner & Participation Tracker</p>
        <h2 className="auth-mode-title">{title}</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          {mode !== 'forgot' && (
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={
                  mode === 'register' ? 'new-password' : 'current-password'
                }
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? 'Please wait…'
              : mode === 'forgot'
                ? 'Send reset link'
                : mode === 'register'
                  ? 'Create account'
                  : 'Sign in'}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'login' && (
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setMode('forgot')
                setError('')
                setMessage('')
              }}
            >
              Forgot password?
            </button>
          )}

          {mode === 'forgot' ? (
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setMode('login')
                setError('')
                setMessage('')
              }}
            >
              Back to sign in
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-link"
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register')
                setError('')
                setMessage('')
              }}
            >
              {mode === 'register'
                ? 'Already have an account? Sign in'
                : 'Need an account? Register'}
            </button>
          )}
        </div>

        {mode === 'register' && (
          <p className="auth-hint">
            After registration you must verify your email. Your account stays
            pending until an admin approves it.
          </p>
        )}
        {mode === 'forgot' && (
          <p className="auth-hint">
            We will email a reset link. Open only the newest email — each link
            works once. Use &quot;Reset password&quot; in the app, not an old
            signup verification email.
          </p>
        )}
        <div className="auth-theme-row">
          <ThemeSwitcher />
        </div>
      </div>
      </div>
    </div>
  )
}
