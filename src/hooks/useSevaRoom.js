import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSevaConfig,
  seedSevaConfigIfEmpty,
  subscribeSevaConfig,
  saveSevaConfig,
} from '../services/sevaService'

export function useSevaRoom({ autoSeed = true } = {}) {
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const dirtyRef = useRef(false)

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      if (autoSeed) {
        try {
          await seedSevaConfigIfEmpty()
        } catch (e) {
          if (!cancelled) setError(e.message)
        }
      }
    }

    start()

    const unsub = subscribeSevaConfig(
      (data) => {
        if (cancelled) return
        if (!dirtyRef.current) {
          setDraft(data)
        }
        setLoading(false)
      },
      (err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      },
    )

    return () => {
      cancelled = true
      unsub()
    }
  }, [autoSeed])

  const patchDraft = useCallback((updater) => {
    setDraft((prev) => {
      if (!prev) return prev
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next
    })
    setDirty(true)
  }, [])

  const save = useCallback(async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      const saved = await saveSevaConfig(draft)
      setDraft(saved)
      setDirty(false)
      dirtyRef.current = false
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }, [draft])

  const discardChanges = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const data = await getSevaConfig()
      setDraft(data)
      setDirty(false)
      dirtyRef.current = false
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    config: draft,
    loading,
    saving,
    dirty,
    error,
    patchDraft,
    save,
    discardChanges,
    setDraft,
  }
}
