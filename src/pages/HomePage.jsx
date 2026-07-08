import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserDashboardPage } from './UserDashboardPage'

/** Members use meal voting; maharaj lands on vote dashboard only. */
export function HomePage() {
  const { isMaharaj } = useAuth()
  if (isMaharaj) {
    return <Navigate to="/admin/votes" replace />
  }
  return <UserDashboardPage />
}
