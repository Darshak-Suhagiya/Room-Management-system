import { useEffect } from 'react'

const BODY_CLASS = 'mobile-action-bar-visible'

/** Reserve app-main padding while a fixed mobile action bar is shown. */
export function useMobileActionBar(visible) {
  useEffect(() => {
    if (!visible) return undefined
    document.body.classList.add(BODY_CLASS)
    return () => document.body.classList.remove(BODY_CLASS)
  }, [visible])
}
