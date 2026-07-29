import { useEffect, useRef } from 'react'
import { usePullToRefresh } from '../contexts/PullToRefreshContext'
import { useMobileTabPanelActive } from '../contexts/MobileTabPanelContext'

/**
 * Register a soft refresh handler for the current page.
 * On MobileTabCache pages, only the active tab's handler is registered.
 */
export function useRegisterPullToRefresh(handler) {
  const { register } = usePullToRefresh()
  const isTabActive = useMobileTabPanelActive()
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!isTabActive) return undefined
    return register(() => handlerRef.current?.())
  }, [register, isTabActive])
}
