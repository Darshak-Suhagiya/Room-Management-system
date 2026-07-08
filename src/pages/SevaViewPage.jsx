import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { SevaGroupDefinitions } from '../components/seva/SevaGroupDefinitions'
import { SevaDailySchedule } from '../components/seva/SevaDailySchedule'
import { SevaWeeklySection } from '../components/seva/SevaWeeklySection'
import { SevaLoadTable } from '../components/seva/SevaLoadTable'
import { useSevaRoom } from '../hooks/useSevaRoom'

export function SevaViewPage() {
  const { isMaharaj } = useAuth()
  const { config, loading, error } = useSevaRoom()

  if (isMaharaj) {
    return <Navigate to="/admin/votes" replace />
  }

  if (loading || !config) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page seva-page">
      <header className="page-header seva-no-print">
        <div>
          <h2>Room seva</h2>
          <p>Weekly seva schedule and load per person.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.print()}
        >
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
