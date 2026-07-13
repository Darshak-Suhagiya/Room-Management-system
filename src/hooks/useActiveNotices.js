import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getCachedBannerNotices,
  listBannerNoticeCandidates,
  listBannerNoticesForUser,
} from '../services/noticeService'

/**
 * Active unread notices for a page surface ('meals' | 'seva').
 * Uses session cache + fast candidate fetch, then confirms receipts.
 */
export function useActiveNotices(page) {
  const { profile, user } = useAuth()
  const userId = profile?.id || user?.uid || null
  const [notices, setNotices] = useState(() =>
    userId ? getCachedBannerNotices(userId, page) ?? [] : [],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!profile || !user) {
      setNotices([])
      setLoading(false)
      return
    }
    const uid = profile.id || user.uid
    const cached = getCachedBannerNotices(uid, page)
    if (cached) {
      setNotices(cached)
      setLoading(false)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const profileForBanner = { ...profile, id: uid }
      // Fast path: active-only query + local read filter (1 round trip)
      const candidates = await listBannerNoticeCandidates(page, profileForBanner)
      setNotices(candidates)
      setLoading(false)

      // Confirm unread against receipts (uses in-memory active cache)
      const confirmed = await listBannerNoticesForUser(page, profileForBanner)
      setNotices(confirmed)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load notices.')
      if (!cached) setNotices([])
    } finally {
      setLoading(false)
    }
  }, [page, profile, user])

  useEffect(() => {
    reload()
  }, [reload])

  const removeNotice = useCallback((noticeId) => {
    setNotices((prev) => prev.filter((n) => n.id !== noticeId))
  }, [])

  return { notices, loading, error, reload, removeNotice }
}
