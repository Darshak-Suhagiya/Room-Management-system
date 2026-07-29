import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react'
import {
  invalidateActiveNoticesCache,
  listActiveNotices,
} from '../services/noticeService'

const PullToRefreshContext = createContext(null)

async function defaultSoftRefresh() {
  invalidateActiveNoticesCache()
  try {
    await listActiveNotices({ bypassCache: true })
  } catch {
    /* ignore */
  }
  // Brief pause so the spinner feels intentional even with no page handler.
  await new Promise((r) => setTimeout(r, 280))
}

export function PullToRefreshProvider({ children }) {
  const handlerRef = useRef(null)

  const register = useCallback((handler) => {
    handlerRef.current = handler
    return () => {
      if (handlerRef.current === handler) {
        handlerRef.current = null
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    const handler = handlerRef.current
    if (typeof handler === 'function') {
      await handler()
      return
    }
    await defaultSoftRefresh()
  }, [])

  const value = useMemo(() => ({ register, refresh }), [register, refresh])

  return (
    <PullToRefreshContext.Provider value={value}>
      {children}
    </PullToRefreshContext.Provider>
  )
}

export function usePullToRefresh() {
  const ctx = useContext(PullToRefreshContext)
  if (!ctx) {
    throw new Error('usePullToRefresh must be used within PullToRefreshProvider')
  }
  return ctx
}
