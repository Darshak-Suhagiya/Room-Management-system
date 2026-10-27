import { ROLES } from './constants'

export function isAdminRole(profile) {
  return profile?.role === ROLES.ADMIN
}

export function isMaharajRole(profile) {
  return profile?.role === ROLES.MAHARAJ
}

export function isResidentRole(profile) {
  return profile?.role === ROLES.RESIDENT
}

export function isKitchenLeaderRole(profile) {
  return profile?.role === ROLES.KITCHEN_LEADER
}

export function isRoomLeaderRole(profile) {
  return profile?.role === ROLES.ROOM_LEADER
}

export function isObserverRole(profile) {
  return profile?.role === ROLES.OBSERVER
}

/** Lives in the room: votes, reports, meals, billing. Observers and Maharaj do not. */
export function isRoomParticipant(profile) {
  return Boolean(profile?.role) && !isMaharajRole(profile) && !isObserverRole(profile)
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MAHARAJ]: 'Maharaj',
  [ROLES.RESIDENT]: 'Member',
  [ROLES.KITCHEN_LEADER]: 'Kitchen leader',
  [ROLES.ROOM_LEADER]: 'Room leader',
  [ROLES.OBSERVER]: 'Observer',
}

export const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.MAHARAJ,
  ROLES.RESIDENT,
  ROLES.KITCHEN_LEADER,
  ROLES.ROOM_LEADER,
  ROLES.OBSERVER,
]

/** Roles that live in the room. Notices and push target these, not observers. */
export const ROOM_ROLES = ALL_ROLES.filter((role) => role !== ROLES.OBSERVER)

/** Vote dashboard: every approved role. Lock / total-edit stay separate. */
export function canAccessVoteDashboard(profile) {
  return Boolean(profile?.role)
}

/** Lock / unlock meal slots on vote dashboard. */
export function canLockVotes(profile) {
  return (
    isAdminRole(profile) ||
    isMaharajRole(profile) ||
    isKitchenLeaderRole(profile) ||
    isRoomLeaderRole(profile)
  )
}

/** Apply or remove default votes for members (applying also locks the slot). */
export function canApplyDefaultVotes(profile) {
  return canLockVotes(profile)
}

/** Members who can set their own default votes. */
export function canSetDefaultVotes(profile) {
  return isRoomParticipant(profile)
}

/** Adjust total counts (number / yes totals). */
export function canAdjustVoteTotals(profile) {
  return isAdminRole(profile) || isKitchenLeaderRole(profile)
}

/** Show raw vote sum alongside adjusted total (admin + member + kitchen/room leader + observer). */
export function showVoteCountBreakdown(profile) {
  return (
    isAdminRole(profile) ||
    isResidentRole(profile) ||
    isKitchenLeaderRole(profile) ||
    isRoomLeaderRole(profile) ||
    isObserverRole(profile)
  )
}

/** Maharaj sees final adjusted totals only. */
export function showsAdjustedTotalOnly(profile) {
  return isMaharajRole(profile)
}

/** Meal item reviews (Good/Okay/Bad + text) — hidden from Maharaj and observers. */
export function canSeeMealReviews(profile) {
  return !isMaharajRole(profile) && !isObserverRole(profile)
}

/** Menu analytics page — hidden from Maharaj and observers. */
export function canSeeMenuAnalytics(profile) {
  return !isMaharajRole(profile) && !isObserverRole(profile)
}

/** Catalog notes/recipe and cook-only meal notes on the vote dashboard. */
export function canSeeMaharajMenuDetails(profile) {
  return isMaharajRole(profile) || isAdminRole(profile)
}

/** Menu planning page: admin, kitchen leader, room leader, or member. */
export function canPlanMenus(profile) {
  return isRoomParticipant(profile)
}

/** Menu catalog editing: admin or kitchen leader. */
export function canEditMenuCatalog(profile) {
  return isAdminRole(profile) || isKitchenLeaderRole(profile)
}

/** Users page: admin or room leader. */
export function canManageUsers(profile) {
  return isAdminRole(profile) || isRoomLeaderRole(profile)
}

/** Seva Admin + printable: admin or room leader. */
export function canManageSeva(profile) {
  return isAdminRole(profile) || isRoomLeaderRole(profile)
}

/** Create leave entries: approved room members. */
export function canCreateLeaves(profile) {
  return isRoomParticipant(profile)
}

/** Update/delete Maharaj leave entries: admin, kitchen lead, or room lead. */
export function canManageLeaves(profile) {
  return (
    isAdminRole(profile) ||
    isKitchenLeaderRole(profile) ||
    isRoomLeaderRole(profile)
  )
}

/** Create / edit / end notices: admin or room leader. */
export function canManageNotices(profile) {
  return isAdminRole(profile) || isRoomLeaderRole(profile)
}

/** Push notifications admin: admin, kitchen leader, or room leader. */
export function canManagePush(profile) {
  return (
    isAdminRole(profile) ||
    isKitchenLeaderRole(profile) ||
    isRoomLeaderRole(profile)
  )
}

/** View notice list + seen/read analytics: admin, room leader, or kitchen leader. */
export function canViewNoticeAnalytics(profile) {
  return (
    isAdminRole(profile) ||
    isRoomLeaderRole(profile) ||
    isKitchenLeaderRole(profile)
  )
}

/** Stocks + shopping pages: any approved room member. */
export function canViewStocks(profile) {
  return isRoomParticipant(profile)
}

/** Finance pages: any approved role except Maharaj. Observers are view-only. */
export function canViewFinance(profile) {
  return Boolean(profile?.role) && !isMaharajRole(profile)
}

/** Create/edit collections, deposits, fund: admin or room leader. */
export function canManageFinance(profile) {
  return isAdminRole(profile) || isRoomLeaderRole(profile)
}

/**
 * Who can see every member's report answers and notes.
 * Opening Reports is separate: every approved member can fill their own.
 */
export function canAccessReports(profile, allowedUserIds) {
  if (!profile) return false
  if (isAdminRole(profile) || isObserverRole(profile)) return true
  const uid = profile.id
  if (!uid) return false
  return (allowedUserIds ?? []).includes(uid)
}

/** Fill answers and write person notes. Observers watch only. */
export function canWriteReports(profile) {
  return Boolean(profile?.role) && !isObserverRole(profile)
}

/** Create groups, manage editors, create/assign shopping tickets. */
export function canManageStocks(profile) {
  return isAdminRole(profile) || isKitchenLeaderRole(profile)
}

/** Edit items / adjust qty in a group (managers or per-group editors). */
export function canEditStockGroup(profile, group) {
  if (canManageStocks(profile)) return true
  const uid = profile?.id
  if (!uid || !group) return false
  return (group.editorUserIds ?? []).includes(uid)
}

/** Edit or check lines on a shopping ticket. */
export function canEditShoppingTicket(profile, ticket) {
  if (canManageStocks(profile)) return true
  const uid = profile?.id
  if (!uid || !ticket) return false
  return (ticket.assigneeIds ?? []).includes(uid)
}

/**
 * Roles the actor may assign on the Users page.
 * Room leaders can assign any role except Admin.
 */
export function assignableRolesForActor(actorProfile) {
  if (isAdminRole(actorProfile)) return [...ALL_ROLES]
  if (isRoomLeaderRole(actorProfile)) {
    return ALL_ROLES.filter((r) => r !== ROLES.ADMIN)
  }
  return []
}

/** Room leaders cannot edit admin accounts at all. */
export function canEditManagedUser(actorProfile, targetUser) {
  if (!canManageUsers(actorProfile)) return false
  if (isAdminRole(actorProfile)) return true
  return targetUser?.role !== ROLES.ADMIN
}
