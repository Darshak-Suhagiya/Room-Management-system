const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const rupeeWholeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function toPaise(rupees) {
  const n = Number(rupees)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function paiseToRupees(paise) {
  const n = Number(paise)
  if (!Number.isFinite(n)) return 0
  return n / 100
}

export function formatRupees(paise) {
  const n = Number(paise)
  if (!Number.isFinite(n)) return '₹0.00'
  return rupeeFormatter.format(n / 100)
}

export function formatRupeesShort(paise) {
  const n = Number(paise)
  if (!Number.isFinite(n)) return '₹0'
  if (n % 100 === 0) return rupeeWholeFormatter.format(n / 100)
  return rupeeFormatter.format(n / 100)
}

/**
 * Parse a rupee input into paise.
 * Accepts 112, 112.13, 1,120. Rejects negatives and >2 decimals.
 */
export function parseRupeesToPaise(input) {
  if (input === null || input === undefined || input === '') {
    return { ok: false, message: 'Enter an amount.' }
  }
  const raw = String(input).trim().replace(/,/g, '').replace(/₹/g, '')
  if (!raw) return { ok: false, message: 'Enter an amount.' }
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    return {
      ok: false,
      message: 'Enter a valid rupee amount (up to 2 decimals).',
    }
  }
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: 'Amount must be 0 or more.' }
  }
  return { ok: true, value: Math.round(n * 100) }
}

export function sumPaise(list) {
  if (!Array.isArray(list)) return 0
  return list.reduce((sum, n) => sum + (Number(n) || 0), 0)
}

export function clampNonNegative(paise) {
  const n = Number(paise)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n))
}

export function currentPeriodId(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatPeriodLabel(periodId) {
  if (!periodId || !/^\d{4}-\d{2}$/.test(periodId)) return periodId || ''
  const [y, m] = periodId.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })
}

export function addDaysToDateId(dateId, days) {
  const [y, m, d] = String(dateId).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function formatDateLabel(dateId) {
  if (!dateId) return ''
  const [y, m, d] = String(dateId).split('-').map(Number)
  if (!y || !m || !d) return String(dateId)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function currentDateId(timeZone = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatSignedRupees(paise) {
  const n = Number(paise) || 0
  const formatted = formatRupeesShort(Math.abs(n))
  if (n > 0) return `+${formatted}`
  if (n < 0) return `−${formatted}`
  return formatted
}

export function movementDateLabel(movement) {
  if (movement?.occurredOn) return formatDateLabel(movement.occurredOn)
  return formatDateTime(movement?.createdAt)
}

export function daysBetweenDateIds(fromId, toId) {
  const a = String(fromId).split('-').map(Number)
  const b = String(toId).split('-').map(Number)
  const da = new Date(a[0], a[1] - 1, a[2])
  const db = new Date(b[0], b[1] - 1, b[2])
  return Math.round((db - da) / 86400000)
}
