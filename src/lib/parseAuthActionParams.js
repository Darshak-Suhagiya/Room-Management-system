import { parseActionCodeURL } from 'firebase/auth'

const OPERATION_TO_MODE = {
  VERIFY_EMAIL: 'verifyEmail',
  PASSWORD_RESET: 'resetPassword',
}

/**
 * Read Firebase email-link params (mode + oobCode) from query or hash.
 * Links may land as ?mode=...&oobCode=... or in the URL hash on some hosts.
 */
export function parseAuthActionParams(searchParams) {
  if (typeof window === 'undefined') {
    return {
      mode: searchParams?.get('mode') ?? null,
      oobCode: searchParams?.get('oobCode') ?? null,
    }
  }

  const fromSearch = (sp) => ({
    mode: sp.get('mode'),
    oobCode: sp.get('oobCode') || sp.get('oobcode'),
  })

  let { mode, oobCode } = fromSearch(
    searchParams ?? new URLSearchParams(window.location.search),
  )
  if (mode && oobCode) return { mode, oobCode }

  try {
    const url = new URL(window.location.href)
    ;({ mode, oobCode } = fromSearch(url.searchParams))
    if (mode && oobCode) return { mode, oobCode }

    const rawHash = url.hash?.replace(/^#/, '') ?? ''
    if (rawHash) {
      const hashPart = rawHash.includes('?')
        ? rawHash.slice(rawHash.indexOf('?') + 1)
        : rawHash.includes('=')
          ? rawHash
          : ''
      if (hashPart) {
        ;({ mode, oobCode } = fromSearch(new URLSearchParams(hashPart)))
        if (mode && oobCode) return { mode, oobCode }
      }
    }
  } catch {
    /* ignore malformed URL */
  }

  if (typeof window !== 'undefined') {
    const parsed = parseActionCodeURL(window.location.href)
    if (parsed?.code) {
      const mappedMode =
        OPERATION_TO_MODE[parsed.operation] ??
        (parsed.operation === 'PASSWORD_RESET'
          ? 'resetPassword'
          : parsed.operation === 'VERIFY_EMAIL'
            ? 'verifyEmail'
            : null)
      if (mappedMode) {
        return { mode: mappedMode, oobCode: parsed.code }
      }
    }
  }

  return { mode: null, oobCode: null }
}

export function hasAuthActionParams(searchParams) {
  const { mode, oobCode } = parseAuthActionParams(searchParams)
  return Boolean(mode && oobCode)
}
