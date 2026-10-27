import { deleteDoc, doc, writeBatch } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS } from '../config/constants'
import { isPastDate } from '../utils/mealDateUtils'
import { getPlannedMenuItems } from '../utils/menuVoteUtils'
import { buildDefaultParticipation } from '../utils/mealDefaultsUtils'
import {
  getMealParticipation,
  getParticipationsForSlot,
  participationDocId,
} from './participationService'
import { voteLockDocId } from './voteLockService'
import { listAllMealDefaults } from './mealDefaultsService'

const BATCH_LIMIT = 400

/**
 * Fill a default vote for every member who has not voted on this slot, then
 * lock the slot and record who applied it. Existing votes are never touched.
 * Returns { added, total } (members filled now / members now on a default).
 */
export async function applyDefaultVotes({
  dateId,
  slot,
  menu,
  catalog,
  users,
  actor,
}) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  if (isPastDate(dateId)) {
    throw new Error('Default votes cannot be applied to past dates.')
  }

  const plannedItems = getPlannedMenuItems(menu, slot, catalog)
  const [participations, defaultsByUser] = await Promise.all([
    getParticipationsForSlot(dateId, slot),
    listAllMealDefaults(),
  ])
  const hasDoc = new Set(participations.map((p) => p.userId))
  const existingDefaults = participations.filter((p) => p.isDefault).length

  const at = new Date().toISOString()
  const actorName = actor?.displayName?.trim() || 'Member'
  const appliedBy = { userId: actor?.userId ?? '', displayName: actorName, at }

  const writes = []
  for (const user of users) {
    if (hasDoc.has(user.id)) continue
    const filled = buildDefaultParticipation(
      defaultsByUser[user.id],
      plannedItems,
      dateId,
    )
    writes.push({
      ref: doc(
        db,
        COLLECTIONS.MEAL_PARTICIPATION,
        participationDocId(user.id, dateId, slot),
      ),
      data: {
        userId: user.id,
        date: dateId,
        slot,
        notEating: filled.notEating,
        votes: filled.votes,
        isVoted: true,
        isDefault: true,
        defaultAppliedBy: appliedBy,
        updatedAt: at,
      },
    })
  }

  const added = writes.length
  const total = existingDefaults + added
  const lockRef = doc(db, COLLECTIONS.VOTE_LOCKS, voteLockDocId(dateId, slot))
  const lockPayload = {
    date: dateId,
    slot,
    locked: true,
    lockedAt: at,
    lockedBy: actor?.userId ?? null,
  }
  if (total > 0) {
    lockPayload.defaultApplied = {
      userId: actor?.userId ?? '',
      displayName: actorName,
      at,
      count: total,
    }
  }

  // Participation writes first, lock last so a failure never locks early.
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const chunk = writes.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)
    for (const w of chunk) batch.set(w.ref, w.data)
    const isLast = i + BATCH_LIMIT >= writes.length
    if (isLast) batch.set(lockRef, lockPayload, { merge: true })
    await batch.commit()
  }
  if (writes.length === 0) {
    const batch = writeBatch(db)
    batch.set(lockRef, lockPayload, { merge: true })
    await batch.commit()
  }

  return { added, total }
}

/** Remove one member's default vote (never deletes a vote the member made). */
export async function removeDefaultVote(dateId, slot, userId) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const existing = await getMealParticipation(userId, dateId, slot)
  if (!existing) throw new Error('No vote found for this member.')
  if (!existing.isDefault) {
    throw new Error('This vote was made by the member, not a default.')
  }
  await deleteDoc(
    doc(
      db,
      COLLECTIONS.MEAL_PARTICIPATION,
      participationDocId(userId, dateId, slot),
    ),
  )
}
