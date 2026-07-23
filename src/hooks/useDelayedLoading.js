import { useEffect, useState } from 'react'

/** True only after `isLoading` stays true for `delayMs` — avoids sub-threshold flashes. */
export function useDelayedLoading(isLoading, delayMs = 250) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setShow(false)
      return undefined
    }

    const timer = setTimeout(() => setShow(true), delayMs)
    return () => clearTimeout(timer)
  }, [isLoading, delayMs])

  return show
}
