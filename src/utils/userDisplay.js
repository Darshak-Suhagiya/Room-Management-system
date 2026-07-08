export function getUserInitials(displayName, email) {
  const source = (displayName || email || 'U').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

export function getRoleLabel(profile, { isAdmin, isMaharaj }) {
  if (isAdmin) return 'Admin'
  if (isMaharaj) return 'Maharaj'
  if (profile?.role === 'resident') return 'Member'
  return null
}
