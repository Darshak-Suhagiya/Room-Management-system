import { Navigate, useLocation } from 'react-router-dom'
import { hasAuthActionParams } from '../lib/parseAuthActionParams'

/** Send Firebase email links that land on / or /login to /auth/action with params intact. */
export function AuthQueryRedirect({ fallback = '/' }) {
  const location = useLocation()

  if (hasAuthActionParams(new URLSearchParams(location.search))) {
    return (
      <Navigate
        to={{ pathname: '/auth/action', search: location.search }}
        replace
      />
    )
  }

  return <Navigate to={fallback} replace />
}
