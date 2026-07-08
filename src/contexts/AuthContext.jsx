import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import {
  canAccessVoteDashboard,
  canAdjustVoteTotals,
  canLockVotes,
  isMaharajRole,
  showVoteCountBreakdown,
} from '../config/rolePermissions'
import {
  ensureUserProfile,
  getUserProfile,
  isAdmin,
  isUserDeactivated,
  isUserPending,
} from '../services/userService'
import { getAuthActionUrl } from '../lib/authActionUrl'
import { formatAuthError } from '../utils/authErrors'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authNotice, setAuthNotice] = useState(null)

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false)
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      try {
        if (firebaseUser) {
          let userProfile = await getUserProfile(firebaseUser.uid)
          if (!userProfile) {
            userProfile = await ensureUserProfile(firebaseUser)
          }

          if (isUserDeactivated(userProfile)) {
            setAuthNotice('deactivated')
            await signOut(auth)
            setProfile(null)
            setUser(null)
            return
          }

          setProfile(userProfile)
          if (isUserPending(userProfile)) {
            setAuthNotice('pending')
          } else {
            setAuthNotice(null)
          }
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Profile load failed:', err)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      authNotice,
      clearAuthNotice: () => setAuthNotice(null),
      isAdmin: isAdmin(profile),
      isMaharaj: isMaharajRole(profile),
      canAccessVoteDashboard: canAccessVoteDashboard(profile),
      canLockVotes: canLockVotes(profile),
      canAdjustVoteTotals: canAdjustVoteTotals(profile),
      showVoteCountBreakdown: showVoteCountBreakdown(profile),
      isApproved: profile
        ? !isUserPending(profile) && !isUserDeactivated(profile)
        : false,
      isPending: isUserPending(profile),
      isDeactivatedNotice: authNotice === 'deactivated',
      emailVerified: Boolean(user?.emailVerified),
      needsEmailVerification:
        Boolean(user) && !user?.emailVerified && !isAdmin(profile),
      isConfigured: isFirebaseConfigured,
      login: async (email, password) => {
        setAuthNotice(null)
        const cred = await signInWithEmailAndPassword(auth, email, password)
        const userProfile = await getUserProfile(cred.user.uid)
        if (isUserDeactivated(userProfile)) {
          await signOut(auth)
          setAuthNotice('deactivated')
          throw new Error(
            'Your account is deactivated. Contact an admin.',
          )
        }
        return cred
      },
      register: async (email, password) => {
        setAuthNotice(null)
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await ensureUserProfile(cred.user)
        try {
          await sendEmailVerification(cred.user, {
            url: getAuthActionUrl(),
            handleCodeInApp: true,
          })
        } catch (err) {
          console.error('Verification email failed:', err)
        }
        setAuthNotice('pending')
        return cred
      },
      sendVerificationEmail: async () => {
        if (!auth.currentUser) {
          throw new Error('You must be signed in.')
        }
        await sendEmailVerification(auth.currentUser, {
          url: getAuthActionUrl(),
          handleCodeInApp: true,
        })
      },
      reloadAuthUser: async () => {
        if (!auth.currentUser) return null
        await reload(auth.currentUser)
        setUser({ ...auth.currentUser })
        return auth.currentUser
      },
      resetPassword: async (email) => {
        const trimmed = email.trim()
        if (!trimmed) {
          throw new Error('Enter your email address.')
        }
        await sendPasswordResetEmail(auth, trimmed, {
          url: getAuthActionUrl(),
          handleCodeInApp: true,
        })
      },
      logout: () => signOut(auth),
      refreshProfile: async () => {
        if (!user) return null
        const userProfile = await getUserProfile(user.uid)
        setProfile(userProfile)
        return userProfile
      },
      formatAuthError,
    }),
    [user, profile, loading, authNotice],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
