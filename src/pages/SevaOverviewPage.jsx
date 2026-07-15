import { useMemo } from 'react'
import { Navigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSevaRoom } from '../hooks/useSevaRoom'
import { SevaDutyCard } from '../components/seva/SevaDutyCard'
import { SevaGroupLegend } from '../components/seva/SevaGroupLegend'
import { SevaLoadOverview } from '../components/seva/SevaLoadOverview'
import { NoticeBannerSlot } from '../components/NoticeBannerSlot'
import { PushPermissionCard } from '../components/PushPermissionCard'
import { NOTICE_PAGES } from '../config/constants'
import { getPersonById } from '../utils/sevaLoadUtils'
import {
  findLinkedPerson,
  getTodayWeekDayId,
} from '../utils/sevaDayUtils'

export function SevaOverviewPage() {
  const { user, isMaharaj } = useAuth()
  const { config, loading, error } = useSevaRoom()

  const todayId = getTodayWeekDayId()
  const weekDays = config?.weekDays ?? []

  const linkedPerson = useMemo(
    () => findLinkedPerson(config?.people, user?.uid),
    [config?.people, user?.uid],
  )

  if (isMaharaj) {
    return <Navigate to="/admin/votes" replace />
  }

  if (loading || !config) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page seva-overview-page">
      <NoticeBannerSlot page={NOTICE_PAGES.SEVA} />
      <PushPermissionCard />
      <header className="page-header page-header-icon">
        <span className="page-header-icon-wrap" aria-hidden>
          <Sparkles size={22} />
        </span>
        <div>
          <h2>Room Seva</h2>
          <p>Who serves what this week — duties, turns, and load.</p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <SevaGroupLegend dailyGroups={config.dailyGroups} />

      <section className="seva-daily-section">
        <header className="seva-section-head">
          <div>
            <h3>Daily seva · full week</h3>
            <p className="muted">
              All days at once. Today’s column is highlighted.
            </p>
          </div>
        </header>

        <div className="seva-week-board">
          {weekDays.map((day) => {
            const dayAssign = config.assignments?.[day.id] ?? {}
            const isToday = day.id === todayId
            return (
              <div
                key={day.id}
                className={`seva-week-col${isToday ? ' is-today' : ''}`}
              >
                <header className="seva-week-col-head">
                  <span className="seva-week-col-label">{day.label}</span>
                  {isToday ? (
                    <span className="seva-inline-today">Today</span>
                  ) : null}
                </header>
                <div className="seva-week-col-cards">
                  {(config.dailyGroups ?? []).map((group, index) => (
                    <SevaDutyCard
                      key={`${day.id}-${group.id}`}
                      group={group}
                      slots={dayAssign[group.id] ?? []}
                      people={config.people}
                      linkedPersonId={linkedPerson?.id}
                      compact
                      toneIndex={index}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="seva-weekly-section">
        <header className="seva-section-head">
          <div>
            <h3>Weekly (S5)</h3>
            <p className="muted">Tasks that span the whole week.</p>
          </div>
        </header>
        <div className="seva-weekly-grid">
          {(config.weeklyTasks ?? []).map((task) => (
            <article key={task.id} className="seva-weekly-card">
              <h4>{task.title}</h4>
              <div className="seva-duty-assignees">
                {(task.personIds ?? []).map((pid, idx) => {
                  if (!pid) {
                    return (
                      <span
                        key={`${task.id}-open-${idx}`}
                        className="seva-assignee is-open"
                      >
                        Open
                      </span>
                    )
                  }
                  const person = getPersonById(config.people, pid)
                  const isYou = person?.id === linkedPerson?.id
                  return (
                    <span
                      key={`${task.id}-${pid}-${idx}`}
                      className={`seva-assignee${isYou ? ' is-you' : ''}`}
                    >
                      <span className="seva-assignee-name">
                        {person?.name ?? pid}
                      </span>
                      {isYou ? (
                        <span className="seva-you-badge">You</span>
                      ) : null}
                    </span>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <SevaLoadOverview config={config} linkedPersonId={linkedPerson?.id} />
    </div>
  )
}
