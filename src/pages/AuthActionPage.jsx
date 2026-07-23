import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { formatActionCodeError } from '../utils/authErrors'
import { parseAuthActionParams } from '../lib/parseAuthActionParams'
import { ThemeSwitcher } from '../components/ThemeSwitcher'

/**
 * Handles Firebase email links: ?mode=resetPassword|verifyEmail&oobCode=...
 */
export function AuthActionPage() {
  const [searchParams] = useSearchParams()
  const { mode, oobCode } = useMemo(
    () => parseAuthActionParams(searchParams),
    [searchParams],
  )

  const [step, setStep] = useState('intro')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setStep('intro')
    setEmail('')
    setPassword('')
    setConfirm('')
    setError('')
    setMessage('')
  }, [mode, oobCode])

  if (!mode || !oobCode) {
    return (
      <AuthActionCard
        title="You're all set"
        subtitle="If you just verified your email or reset your password on the previous screen, you can sign in now. If you still need to finish that step, request a new link from Sign in (use the newest email only)."
      >
        <Link to="/login" className="btn btn-primary">
          Go to sign in
        </Link>
        <Link to="/login" className="text-link">
          Request a new verification or reset link
        </Link>
      </AuthActionCard>
    )
  }

  if (mode !== 'resetPassword' && mode !== 'verifyEmail') {
    return (
      <AuthActionCard
        title="Unsupported link"
        error={`Unknown action "${mode}". Open the latest email from Sign in and try again.`}
      >
        <Link to="/login" className="btn btn-primary">
          Go to sign in
        </Link>
      </AuthActionCard>
    )
  }

  const startReset = async () => {
    setBusy(true)
    setError('')
    try {
      const accountEmail = await verifyPasswordResetCode(auth, oobCode)
      setEmail(accountEmail)
      setStep('form')
    } catch (err) {
      setError(formatActionCodeError(err))
    } finally {
      setBusy(false)
    }
  }

  const submitReset = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await confirmPasswordReset(auth, oobCode, password)
      setMessage('Password updated. You can sign in with your new password.')
      setStep('done')
    } catch (err) {
      setError(formatActionCodeError(err))
    } finally {
      setBusy(false)
    }
  }

  const confirmVerifyEmail = async () => {
    setBusy(true)
    setError('')
    try {
      await applyActionCode(auth, oobCode)
      setMessage('Email verified successfully.')
      setStep('done')
    } catch (err) {
      setError(formatActionCodeError(err))
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'verifyEmail') {
    return (
      <AuthActionCard
        title="Verify email"
        subtitle="Click below to confirm your email. Use only the newest verification email."
        error={error}
        message={message}
        done={step === 'done'}
        doneLabel="Go to sign in"
        doneHref="/login"
      >
        {step === 'intro' && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={confirmVerifyEmail}
          >
            {busy ? 'Please wait…' : 'Verify my email'}
          </button>
        )}
      </AuthActionCard>
    )
  }

  return (
    <AuthActionCard
      title="Reset password"
      subtitle={
        step === 'intro'
          ? 'Open only the most recent password reset email, then click Continue.'
          : email
            ? `Set a new password for ${email}`
            : 'Choose a new password'
      }
      error={error}
      message={message}
      done={step === 'done'}
      doneLabel="Go to sign in"
      doneHref="/login"
    >
      {step === 'intro' && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={startReset}
        >
          {busy ? 'Please wait…' : 'Continue'}
        </button>
      )}
      {step === 'form' && (
        <form className="auth-form" onSubmit={submitReset}>
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthActionCard>
  )
}

function AuthActionCard({
  title,
  subtitle,
  error,
  message,
  done,
  doneLabel,
  doneHref,
  children,
}) {
  return (
    <div className="auth-page pt-safe pb-safe">
      <div className="auth-card account-status-card">
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        {done ? (
          <Link to={doneHref ?? '/login'} className="btn btn-primary">
            {doneLabel ?? 'Continue'}
          </Link>
        ) : (
          children
        )}
        {!done && (
          <Link to="/login" className="text-link">
            Back to sign in
          </Link>
        )}
        <div className="auth-theme-row">
          <ThemeSwitcher />
        </div>
      </div>
    </div>
  )
}
