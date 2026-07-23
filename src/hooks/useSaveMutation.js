import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tracks in-flight saves with a generation token.
 * `stale` is true if the component unmounted or a newer run() started
 * before the previous await finished — skip sheet/form UI updates then.
 */
export function useSaveMutation() {
  const [busy, setBusy] = useState(false)
  const genRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      genRef.current += 1
    }
  }, [])

  const run = useCallback(async (fn) => {
    const gen = ++genRef.current
    setBusy(true)
    try {
      const result = await fn()
      const stale = !mountedRef.current || gen !== genRef.current
      return { ok: true, result, error: null, stale }
    } catch (error) {
      const stale = !mountedRef.current || gen !== genRef.current
      return { ok: false, result: null, error, stale }
    } finally {
      if (mountedRef.current && gen === genRef.current) {
        setBusy(false)
      }
    }
  }, [])

  return { busy, run }
}
