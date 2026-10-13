import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserDashboardPage } from './UserDashboardPage'

/** Members use meal voting; maharaj and observers land on vote dashboard. */
export function HomePage() {
  const { isMaharaj, isObserver } = useAuth()
  if (isMaharaj || isObserver) {
    return <Navigate to="/admin/votes" replace />
  }
  return <UserDashboardPage />
}
