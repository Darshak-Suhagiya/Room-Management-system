import { ROLE_LABELS } from '../config/rolePermissions'

export function getUserInitials(displayName, email) {
  const source = (displayName || email || 'U').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function getRoleLabel(profile) {
  if (!profile?.role) return null
  return ROLE_LABELS[profile.role] ?? null
}
