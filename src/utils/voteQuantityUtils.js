/** Parse and validate meal quantity votes (0.5 step: 1, 1.5, 2, …). */

export function isValidQuantity(val) {
  if (val === undefined || val === null || val === '') return false
  const n = Number(val)
  if (!Number.isFinite(n) || n < 0) return false
  return Math.abs(n * 2 - Math.round(n * 2)) < 1e-9
}

export function parseQuantityInput(raw) {
  if (raw === '' || raw === undefined || raw === null) return ''
  const n = Number(raw)
  if (!Number.isFinite(n)) return raw
  return n
}

export function formatQuantity(val) {
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
    return String(Math.round(n))
  }
  return String(n)
}

export function isValidYesTotal(val) {
  if (val === undefined || val === null || val === '') return false
  const n = Number(val)
  return Number.isFinite(n) && n >= 0 && Number.isInteger(n)
}

/** Validate admin override input before saving. */
export function parseOverrideTotal(raw, { integer = false } = {}) {
  if (raw === null || raw === undefined || raw === '') {
    return { ok: true, value: null }
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    return { ok: false, message: 'Invalid value. Enter a valid number.' }
  }
  if (integer) {
    if (!isValidQuantity(n)) {
      return {
        ok: false,
        message: 'Invalid value. Use steps of 0.5 (e.g. 1, 1.5, 2).',
      }
    }
    return { ok: true, value: n }
  }
  if (!isValidYesTotal(n)) {
    return {
      ok: false,
      message: 'Invalid value. Enter a whole number 0 or greater.',
    }
  }
  return { ok: true, value: n }
}
