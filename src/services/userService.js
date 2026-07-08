import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS, ROLES, USER_STATUS } from '../config/constants'

function normalizeUserDoc(id, data) {
  const status =
    data.role === ROLES.ADMIN
      ? USER_STATUS.APPROVED
      : data.status ?? USER_STATUS.APPROVED
  return { id, ...data, status }
}

export async function getUserProfile(uid) {
  if (!isFirebaseConfigured || !db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid))
  return snap.exists() ? normalizeUserDoc(snap.id, snap.data()) : null
}

export async function listAllUsers() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(collection(db, COLLECTIONS.USERS))
  return snap.docs
    .map((d) => normalizeUserDoc(d.id, d.data()))
    .sort((a, b) =>
      (a.displayName ?? a.email ?? '').localeCompare(
        b.displayName ?? b.email ?? '',
      ),
    )
}

/** Users who may vote and appear in vote stats (members + admins; not maharaj). */
export async function listApprovedUsers() {
  const all = await listAllUsers()
  return all.filter(
    (u) => isUserApproved(u) && u.role !== ROLES.MAHARAJ,
  )
}

export async function ensureUserProfile(user, role = ROLES.RESIDENT) {
  if (!isFirebaseConfigured || !db) return null
  const ref = doc(db, COLLECTIONS.USERS, user.uid)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    return normalizeUserDoc(existing.id, existing.data())
  }
  const profile = {
    email: user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
    role,
    status: role === ROLES.ADMIN ? USER_STATUS.APPROVED : USER_STATUS.PENDING,
    roomNumber: null,
    createdAt: new Date().toISOString(),
  }
  await setDoc(ref, profile)
  return { id: user.uid, ...profile }
}

export async function updateUserStatus(userId, status, updatedBy) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const ref = doc(db, COLLECTIONS.USERS, userId)
  await updateDoc(ref, {
    status,
    statusUpdatedAt: new Date().toISOString(),
    statusUpdatedBy: updatedBy ?? null,
  })
}

/** Removes the Firestore user profile. Firebase Auth account must be removed in Firebase Console if needed. */
export async function deleteUserByAdmin(userId, deletedBy) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const ref = doc(db, COLLECTIONS.USERS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    throw new Error('User not found.')
  }
  const data = snap.data()
  if (data.role === ROLES.ADMIN) {
    throw new Error('Cannot delete an admin account.')
  }
  if (deletedBy && userId === deletedBy) {
    throw new Error('You cannot delete your own account.')
  }
  await deleteDoc(ref)
}

export async function updateUserByAdmin(
  userId,
  { displayName, role },
  updatedBy,
) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const name = String(displayName ?? '').trim()
  if (!name) {
    throw new Error('Name cannot be empty.')
  }
  if (![ROLES.ADMIN, ROLES.MAHARAJ, ROLES.RESIDENT].includes(role)) {
    throw new Error('Invalid role.')
  }

  const ref = doc(db, COLLECTIONS.USERS, userId)
  const patch = {
    displayName: name,
    role,
    profileUpdatedAt: new Date().toISOString(),
    profileUpdatedBy: updatedBy ?? null,
  }
  if (role === ROLES.ADMIN) {
    patch.status = USER_STATUS.APPROVED
  }
  await updateDoc(ref, patch)
}

export function isAdmin(profile) {
  return profile?.role === ROLES.ADMIN
}

export function isUserApproved(profile) {
  if (!profile) return false
  if (isAdmin(profile)) return true
  return (profile.status ?? USER_STATUS.APPROVED) === USER_STATUS.APPROVED
}

export function isUserPending(profile) {
  if (!profile || isAdmin(profile)) return false
  return profile.status === USER_STATUS.PENDING
}

export function isUserDeactivated(profile) {
  if (!profile || isAdmin(profile)) return false
  return profile.status === USER_STATUS.DEACTIVATED
}

