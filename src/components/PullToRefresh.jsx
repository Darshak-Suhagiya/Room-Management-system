import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { usePullToRefresh } from '../contexts/PullToRefreshContext'

const RESISTANCE = 0.45
const MAX_PULL = 96
const THRESHOLD = 60
const REFRESHING_HEIGHT = 52

const IGNORE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '.modal-sheet',
  '[role="dialog"]',
  '.meal-day-strip',
  '.mobile-day-strip',
  '.admin-category-strip',
  '.chip-scroll',
  '.stock-group-tabs',
  '.notif-inbox-panel',
].join(',')

function shouldIgnoreTarget(target) {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(IGNORE_SELECTOR))
}

function isModalOpen() {
  return Boolean(
    document.querySelector(
      '.modal-sheet, [role="dialog"][data-headlessui-state*="open"], [data-open]',
    ),
  )
}

/**
 * Native-feeling pull-to-refresh for the .app-main scrollport (mobile only).
 * Soft-refreshes page data — never remounts the shell or flashes white.
 */
export function PullToRefresh({ scrollRef, children }) {
  const isMobile = useMediaQuery('(max-width: 899px)')
  const { refresh } = usePullToRefresh()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)
  const startYRef = useRef(0)
  const trackingRef = useRef(false)
  const armedRef = useRef(false)

  const setPullSafe = useCallback((value) => {
    pullRef.current = value
    setPull(value)
  }, [])

  useEffect(() => {
    if (!isMobile) return undefined
    const el = scrollRef?.current
    if (!el) return undefined

    const onTouchStart = (e) => {
      if (refreshingRef.current) return
      if (isModalOpen()) return
      if (shouldIgnoreTarget(e.target)) return
      if (el.scrollTop > 0) return
      if (e.touches.length !== 1) return
      startYRef.current = e.touches[0].clientY
      trackingRef.current = true
      armedRef.current = false
      el.style.overscrollBehaviorY = 'none'
    }

    const onTouchMove = (e) => {
      if (!trackingRef.current || refreshingRef.current) return
      const dy = e.touches[0].clientY - startYRef.current
      if (dy <= 0) {
        if (armedRef.current) {
          setPullSafe(0)
          armedRef.current = false
        }
        return
      }
      if (el.scrollTop > 0) {
        trackingRef.current = false
        setPullSafe(0)
        return
      }
      armedRef.current = true
      const resisted = Math.min(MAX_PULL, dy * RESISTANCE)
      setPullSafe(resisted)
      if (resisted > 8 && e.cancelable) {
        e.preventDefault()
      }
    }

    const finish = async () => {
      if (!trackingRef.current) return
      trackingRef.current = false
      const distance = pullRef.current
      armedRef.current = false

      if (distance >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true
        setRefreshing(true)
        setPullSafe(REFRESHING_HEIGHT)
        try {
          await refresh()
        } catch (err) {
          console.error('pull-to-refresh', err)
        } finally {
          refreshingRef.current = false
          setRefreshing(false)
          setPullSafe(0)
          el.style.overscrollBehaviorY = ''
        }
        return
      }

      setPullSafe(0)
      el.style.overscrollBehaviorY = ''
    }

    const onTouchEnd = () => {
      finish()
    }

    const onTouchCancel = () => {
      trackingRef.current = false
      armedRef.current = false
      if (!refreshingRef.current) {
        setPullSafe(0)
        el.style.overscrollBehaviorY = ''
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchCancel, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
      el.style.overscrollBehaviorY = ''
    }
  }, [isMobile, scrollRef, refresh, setPullSafe])

  if (!isMobile) {
    return children
  }

  const showIndicator = pull > 2 || refreshing
  const ready = pull >= THRESHOLD || refreshing

  return (
    <div className="ptr-root">
      <div
        className={`ptr-indicator${ready ? ' is-ready' : ''}${refreshing ? ' is-refreshing' : ''}`}
        style={{ height: showIndicator ? pull : 0 }}
        aria-hidden={!showIndicator}
      >
        <div className="ptr-indicator-inner">
          <Loader2
            size={20}
            className={`ptr-spinner${refreshing || ready ? ' is-spinning' : ''}`}
            style={
              refreshing
                ? undefined
                : {
                    transform: `rotate(${Math.min(360, (pull / THRESHOLD) * 180)}deg)`,
                  }
            }
            aria-hidden
          />
          <span className="ptr-label">
            {refreshing
              ? 'Refreshing…'
              : ready
                ? 'Release to refresh'
                : 'Pull to refresh'}
          </span>
        </div>
      </div>
      {children}
    </div>
  )
}
