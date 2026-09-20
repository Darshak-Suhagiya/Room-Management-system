import { useAuth } from '../contexts/AuthContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { useFinanceData } from '../hooks/useFinanceData'
import { MobilePageSkeleton } from '../components/mobile'
import { FinanceDesktopView } from '../components/finance/desktop/FinanceDesktopView'
import { FinanceMobileView } from '../components/finance/mobile/FinanceMobileView'
import '../components/finance/finance.css'

export function FinancePage() {
  const { user, profile, canManageFinance } = useAuth()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const actorName = profile?.displayName || user?.email || 'Member'
  const data = useFinanceData({
    userId: user?.uid,
    canManage: canManageFinance,
  })

  useRegisterPullToRefresh(async () => {
    await data.reload()
  })

  const showSkeleton = useDelayedLoading(data.loading)

  if (data.loading) {
    if (isMobile) {
      return showSkeleton ? <MobilePageSkeleton artKey="finance" title="Finance" /> : null
    }
    return (
      <div className="page finance-page">
        <MobilePageSkeleton artKey="finance" title="Finance" />
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="page finance-page">
        <p className="form-error">{data.error}</p>
        <button type="button" className="btn btn-secondary" onClick={() => data.reload()}>
          Retry
        </button>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="page finance-page">
        <FinanceMobileView
          canManage={canManageFinance}
          userId={user?.uid}
          actorName={actorName}
          data={data}
        />
      </div>
    )
  }

  return (
    <FinanceDesktopView
      canManage={canManageFinance}
      userId={user?.uid}
      actorName={actorName}
      data={data}
    />
  )
}
