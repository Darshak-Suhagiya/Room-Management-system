import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS, ROLES, USER_STATUS } from '../config/constants'
import { ALL_ROLES, isAdminRole } from '../config/rolePermissions'

function normalizeUserDoc(id, data) {
  const status =
    data.role === ROLES.ADMIN
      ? USER_STATUS.APPROVED
      : data.status ?? USER_STATUS.APPROVED
  return { id, ...data, status }
}

function assertActorCanManageTarget(actorRole, targetRole, action = 'edit') {
  if (!actorRole) {
    throw new Error('Missing permission to manage users.')
  }
  if (actorRole === ROLES.ADMIN) return
  if (actorRole === ROLES.ROOM_LEADER) {
    if (targetRole === ROLES.ADMIN) {
      throw new Error(`You cannot ${action} an admin account.`)
    }
    return
  }
  throw new Error('You do not have permission to manage users.')
}

function assertActorCanAssignRole(actorRole, nextRole) {
  if (!actorRole) {
    throw new Error('Missing permission to manage users.')
  }
  if (actorRole === ROLES.ADMIN) return
  if (actorRole === ROLES.ROOM_LEADER) {
    if (nextRole === ROLES.ADMIN) {
      throw new Error('You cannot assign the Admin role.')
    }
    return
  }
  throw new Error('You do not have permission to manage users.')
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

/** Approved users with Maharaj role (for leave calendar). */
export async function listMaharajUsers() {
  if (!isFirebaseConfigured || !db) return []
  const snap = await getDocs(
    query(collection(db, COLLECTIONS.USERS), where('role', '==', ROLES.MAHARAJ)),
  )
  return snap.docs
    .map((d) => normalizeUserDoc(d.id, d.data()))
    .filter((u) => isUserApproved(u))
    .sort((a, b) =>
      (a.displayName ?? a.email ?? '').localeCompare(
        b.displayName ?? b.email ?? '',
      ),
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

export async function updateUserStatus(userId, status, updatedBy, actorRole) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const ref = doc(db, COLLECTIONS.USERS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    throw new Error('User not found.')
  }
  assertActorCanManageTarget(actorRole, snap.data().role, 'change status for')
  await updateDoc(ref, {
    status,
    statusUpdatedAt: new Date().toISOString(),
    statusUpdatedBy: updatedBy ?? null,
  })
}

/** Removes the Firestore user profile. Firebase Auth account must be removed in Firebase Console if needed. */
export async function deleteUserByAdmin(userId, deletedBy, actorRole) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const ref = doc(db, COLLECTIONS.USERS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    throw new Error('User not found.')
  }
  const data = snap.data()
  assertActorCanManageTarget(actorRole, data.role, 'delete')
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
  actorRole,
) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const name = String(displayName ?? '').trim()
  if (!name) {
    throw new Error('Name cannot be empty.')
  }
  if (!ALL_ROLES.includes(role)) {
    throw new Error('Invalid role.')
  }

  const ref = doc(db, COLLECTIONS.USERS, userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    throw new Error('User not found.')
  }
  const existing = snap.data()
  assertActorCanManageTarget(actorRole, existing.role, 'edit')
  assertActorCanAssignRole(actorRole, role)

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
  return isAdminRole(profile)
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
