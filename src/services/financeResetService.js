import {
  collection,
  doc,
  getDocs,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS } from '../config/constants'
import { isAdminRole } from '../config/rolePermissions'
import { getUserProfile } from './userService'

const WRITE_CHUNK = 80
const WALLET_DOC = 'default'

const WIPE_COLLECTIONS = [
  COLLECTIONS.EXPENSES,
  COLLECTIONS.FINANCE_COLLECTIONS,
  COLLECTIONS.FINANCE_DUES,
  COLLECTIONS.FINANCE_PAYMENTS,
  COLLECTIONS.ROOM_WALLET_MOVEMENTS,
  COLLECTIONS.MEMBER_WALLETS,
  COLLECTIONS.MEMBER_WALLET_MOVEMENTS,
  COLLECTIONS.FINANCE_WALLET_REPAYMENTS,
  COLLECTIONS.FINANCE_FUND_REPAIRS,
]

function nowIso() {
  return new Date().toISOString()
}

async function deleteAllInCollection(name) {
  const snap = await getDocs(collection(db, name))
  const ids = snap.docs.map((item) => item.id)
  for (let i = 0; i < ids.length; i += WRITE_CHUNK) {
    const batch = writeBatch(db)
    for (const id of ids.slice(i, i + WRITE_CHUNK)) {
      batch.delete(doc(db, name, id))
    }
    await batch.commit()
  }
  return ids.length
}

export async function resetFinanceLedger({ actorId } = {}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const profile = actorId ? await getUserProfile(actorId) : null
  if (!isAdminRole(profile)) {
    throw new Error('Only an admin can reset finance.')
  }

  const deleted = {}
  for (const name of WIPE_COLLECTIONS) {
    deleted[name] = await deleteAllInCollection(name)
  }

  const batch = writeBatch(db)
  batch.set(
    doc(db, COLLECTIONS.ROOM_WALLET, WALLET_DOC),
    { balancePaise: 0, updatedAt: nowIso() },
    { merge: true },
  )
  await batch.commit()

  return {
    deleted,
    total: Object.values(deleted).reduce((sum, count) => sum + count, 0),
  }
}
