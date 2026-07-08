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

/** Vote dashboard: admin, maharaj, or member (resident). */
export function canAccessVoteDashboard(profile) {
  return (
    isAdminRole(profile) ||
    isMaharajRole(profile) ||
    isResidentRole(profile)
  )
}

/** Lock / unlock meal slots on vote dashboard. */
export function canLockVotes(profile) {
  return isAdminRole(profile) || isMaharajRole(profile)
}

/** Adjust total counts (number / yes totals). */
export function canAdjustVoteTotals(profile) {
  return isAdminRole(profile)
}

/** Show raw vote sum alongside adjusted total (admin + member). */
export function showVoteCountBreakdown(profile) {
  return isAdminRole(profile) || isResidentRole(profile)
}

/** Maharaj sees final adjusted totals only. */
export function showsAdjustedTotalOnly(profile) {
  return isMaharajRole(profile)
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MAHARAJ]: 'Maharaj',
  [ROLES.RESIDENT]: 'Member',
}

export const ALL_ROLES = [ROLES.ADMIN, ROLES.MAHARAJ, ROLES.RESIDENT]
