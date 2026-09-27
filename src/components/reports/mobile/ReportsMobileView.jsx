import { Download, Users } from 'lucide-react'
import { MobilePageHeader } from '../../mobile'
import { ReportDateBar } from '../ReportDateBar'
import { ReportDayBody } from '../ReportDayBody'

function HeaderActions({ isAdmin, grantedCount, onOpenAccess, onOpenExport }) {
  return (
    <div className="reports-header-actions">
      {isAdmin ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenAccess}>
          <Users size={16} aria-hidden />
          Access{grantedCount > 0 ? ` (${grantedCount})` : ''}
        </button>
      ) : null}
      <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenExport}>
        <Download size={16} aria-hidden />
        Export
      </button>
    </div>
  )
}

export function ReportsMobileView(props) {
  const {
    dateId,
    onDateChange,
    isAdmin,
    grantedCount,
    onOpenAccess,
    onOpenExport,
  } = props

  return (
    <>
      <MobilePageHeader
        artKey="reports"
        size="compact"
        title="Reports"
        description="Events, notes, and a PDF for the dates you choose."
        action={
          <HeaderActions
            isAdmin={isAdmin}
            grantedCount={grantedCount}
            onOpenAccess={onOpenAccess}
            onOpenExport={onOpenExport}
          />
        }
      />
      <ReportDateBar dateId={dateId} onChange={onDateChange} />
      <ReportDayBody {...props} />
    </>
  )
}
