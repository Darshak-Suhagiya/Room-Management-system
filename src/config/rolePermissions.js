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

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MAHARAJ]: 'Maharaj',
  [ROLES.RESIDENT]: 'Member',
  [ROLES.KITCHEN_LEADER]: 'Kitchen leader',
  [ROLES.ROOM_LEADER]: 'Room leader',
}

export const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.MAHARAJ,
  ROLES.RESIDENT,
  ROLES.KITCHEN_LEADER,
  ROLES.ROOM_LEADER,
]

/** Vote dashboard: admin, maharaj, and kitchen leader. */
export function canAccessVoteDashboard(profile) {
  return (
    isAdminRole(profile) ||
    isMaharajRole(profile) ||
    isKitchenLeaderRole(profile)
  )
}

/** Lock / unlock meal slots on vote dashboard. */
export function canLockVotes(profile) {
  return (
    isAdminRole(profile) ||
    isMaharajRole(profile) ||
    isKitchenLeaderRole(profile)
  )
}

/** Adjust total counts (number / yes totals). */
export function canAdjustVoteTotals(profile) {
  return isAdminRole(profile) || isKitchenLeaderRole(profile)
}

/** Show raw vote sum alongside adjusted total (admin + member + kitchen/room leader). */
export function showVoteCountBreakdown(profile) {
  return (
    isAdminRole(profile) ||
    isResidentRole(profile) ||
    isKitchenLeaderRole(profile) ||
    isRoomLeaderRole(profile)
  )
}

/** Maharaj sees final adjusted totals only. */
export function showsAdjustedTotalOnly(profile) {
  return isMaharajRole(profile)
}

/** Meal item reviews (Good/Okay/Bad + text) — hidden from Maharaj. */
export function canSeeMealReviews(profile) {
  return !isMaharajRole(profile)
}

/** Menu analytics page — hidden from Maharaj. */
export function canSeeMenuAnalytics(profile) {
  return !isMaharajRole(profile)
}

/** Catalog notes/recipe and cook-only meal notes on the vote dashboard. */
export function canSeeMaharajMenuDetails(profile) {
  return isMaharajRole(profile) || isAdminRole(profile)
}

/** Menu planning page: admin or kitchen leader. */
export function canPlanMenus(profile) {
  return isAdminRole(profile) || isKitchenLeaderRole(profile)
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

/** Stocks + shopping pages: any profile with a role (approved users via route). */
export function canViewStocks(profile) {
  return Boolean(profile?.role)
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
