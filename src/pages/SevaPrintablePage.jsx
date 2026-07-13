import { Navigate } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { SevaGroupDefinitions } from '../components/seva/SevaGroupDefinitions'
import { SevaDailySchedule } from '../components/seva/SevaDailySchedule'
import { SevaWeeklySection } from '../components/seva/SevaWeeklySection'
import { SevaLoadTable } from '../components/seva/SevaLoadTable'
import { useSevaRoom } from '../hooks/useSevaRoom'

/** Printable spreadsheet view of the weekly seva board (admin / room leader). */
export function SevaPrintablePage() {
  const { canManageSeva } = useAuth()
  const { config, loading, error } = useSevaRoom()

  if (!canManageSeva) {
    return <Navigate to="/" replace />
  }

  if (loading || !config) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page seva-page">
      <header className="page-header seva-no-print page-header-icon">
        <span className="page-header-icon-wrap" aria-hidden>
          <Printer size={22} />
        </span>
        <div>
          <h2>Room Seva Printable</h2>
          <p>Print-ready weekly seva schedule and load per person.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary header-action-btn"
          onClick={() => window.print()}
        >
          <Printer size={16} />
          Print (A4 portrait)
        </button>
      </header>

      {error && <p className="form-error">{error}</p>}

      <div className="seva-print-sheet seva-print-one-page" id="seva-print-area">
        <h1 className="seva-title">{config.title}</h1>
        <SevaGroupDefinitions dailyGroups={config.dailyGroups} />
        <div className="seva-distribution-section">
          <SevaDailySchedule config={config} editable={false} />
          <SevaWeeklySection config={config} editable={false} />
        </div>
        <SevaLoadTable config={config} />
      </div>
    </div>
  )
}
