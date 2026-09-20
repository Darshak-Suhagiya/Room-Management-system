import { ROLES, USER_STATUS } from '../config/constants'

export function displayName(user) {
  if (!user) return ''
  return user.displayName || user.email || user.id || ''
}

export function usablePersonName(name) {
  const value = String(name || '').trim()
  if (!value) return ''
  if (value.toLowerCase() === 'unknown') return ''
  return value
}

export function parseRoster(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (raw && typeof raw === 'object') return Object.values(raw).filter(Boolean)
  return []
}

export function buildPersonNameMap({ users, collections, dues, payments } = {}) {
  const names = new Map()
  const setName = (userId, name) => {
    if (!userId) return
    const usable = usablePersonName(name)
    if (!usable || names.has(userId)) return
    names.set(userId, usable)
  }

  for (const user of users || []) {
    setName(user.id, displayName(user))
  }
  for (const collection of collections || []) {
    for (const row of parseRoster(collection.roster)) {
      setName(row.userId || row.id, row.name)
    }
  }
  for (const due of dues || []) {
    setName(due.userId, due.userName)
  }
  for (const payment of payments || []) {
    setName(payment.userId, payment.userName)
    setName(payment.recordedBy, payment.recordedByName)
  }
  return names
}

export function financePersonName(
  userId,
  { users, collection, collections, dues, payments, names, fallback } = {},
) {
  if (!userId) return 'Unknown'
  if (names?.get(userId)) return names.get(userId)

  const fromUsers = (users || []).find((u) => u.id === userId)
  const fromUserName = usablePersonName(displayName(fromUsers))
  if (fromUserName) return fromUserName

  const rosterPools = [
    ...parseRoster(collection?.roster),
    ...(collections || []).flatMap((item) => parseRoster(item.roster)),
  ]
  const fromRoster = rosterPools.find((row) => (row.userId || row.id) === userId)
  const rosterName = usablePersonName(fromRoster?.name)
  if (rosterName) return rosterName

  const fromDue = (dues || []).find((d) => d.userId === userId)
  const dueName = usablePersonName(fromDue?.userName)
  if (dueName) return dueName

  const fromPayment = (payments || []).find((p) => p.userId === userId)
  const paymentName = usablePersonName(fromPayment?.userName)
  if (paymentName) return paymentName

  const fallbackName = usablePersonName(fallback)
  if (fallbackName) return fallbackName
  return 'Unknown'
}

export function isSelectableFinanceUser(user) {
  if (!user || user.role === ROLES.MAHARAJ) return false
  if (user.status === USER_STATUS.PENDING) return false
  return true
}

export function isDefaultIncludedFinanceUser(user) {
  if (!isSelectableFinanceUser(user)) return false
  if (user.status === USER_STATUS.DEACTIVATED) return false
  if (user.role === ROLES.ADMIN) return true
  return user.status === USER_STATUS.APPROVED || user.status == null
}

export function defaultIncludedUserIds(users) {
  return (users || []).filter(isDefaultIncludedFinanceUser).map((u) => u.id)
}
