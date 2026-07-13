/** Map Firebase Auth error codes to user-friendly messages. */
export function formatAuthError(err) {
  const code = err?.code ?? ''
  const map = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/operation-not-allowed':
      'This sign-in method is not enabled. Contact an administrator.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  }
  return map[code] ?? err?.message ?? 'Something went wrong. Please try again.'
}

/** Errors from email link actions (verify email, reset password). */
export function formatActionCodeError(err) {
  const code = err?.code ?? ''
  const map = {
    'auth/expired-action-code':
      'This link has expired. Go to Sign in → Forgot password and request a new email.',
    'auth/invalid-action-code':
      'This link is invalid or was already used. Request a new email — only open the newest message.',
    'auth/user-disabled': 'This account has been disabled. Contact an admin.',
    'auth/weak-password': 'Password must be at least 6 characters.',
  }
  return map[code] ?? formatAuthError(err)
}
