import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSevaRoom } from '../hooks/useSevaRoom'
import { SevaDutyCard } from '../components/seva/SevaDutyCard'
import { SevaDayStrip } from '../components/seva/SevaDayStrip'
import { SevaGroupLegend } from '../components/seva/SevaGroupLegend'
import { SevaLoadOverview } from '../components/seva/SevaLoadOverview'
import { NoticeBannerSlot } from '../components/NoticeBannerSlot'
import { PageHeader } from '../components/ui/PageHeader'
import { MobilePageHeader, MobilePageSkeleton } from '../components/mobile'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { NOTICE_PAGES } from '../config/constants'
import { getPersonById } from '../utils/sevaLoadUtils'
import {
  findLinkedPerson,
  getTodayWeekDayId,
} from '../utils/sevaDayUtils'

function SevaDayColumn({ day, config, linkedPerson, isToday }) {
  const dayAssign = config.assignments?.[day.id] ?? {}
  return (
    <div className={`seva-week-col${isToday ? ' is-today' : ''}`}>
      <header className="seva-week-col-head">
        <span className="seva-week-col-label">{day.label}</span>
        {isToday ? <span className="seva-inline-today">Today</span> : null}
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
}

export function SevaOverviewPage() {
  const { user, isMaharaj } = useAuth()
  const { config, loading, error } = useSevaRoom()

  const todayId = getTodayWeekDayId()
  const weekDays = config?.weekDays ?? []
  const [selectedDayId, setSelectedDayId] = useState(todayId)

  const linkedPerson = useMemo(
    () => findLinkedPerson(config?.people, user?.uid),
    [config?.people, user?.uid],
  )

  const mobileDay = weekDays.find((d) => d.id === selectedDayId) ?? weekDays[0]

  if (isMaharaj) {
    return <Navigate to="/admin/votes" replace />
  }

  const showLoadSkeleton = useDelayedLoading(loading || !config)

  if (loading || !config) {
    return showLoadSkeleton ? <MobilePageSkeleton /> : null
  }

  return (
    <div className="page seva-overview-page">
      <NoticeBannerSlot page={NOTICE_PAGES.SEVA} />

      <div className="layout-desktop">
        <PageHeader
          icon={Sparkles}
          title="Room Seva"
          description="Who serves what this week — duties, turns, and load."
        />
      </div>

      <div className="layout-mobile">
        <MobilePageHeader
          icon={Sparkles}
          title="Room Seva"
          description="Who serves what this week — duties and load."
        />
      </div>

      <div className="mobile-section-gap">
      {error && <p className="form-error">{error}</p>}

      <SevaGroupLegend dailyGroups={config.dailyGroups} />

      <section className="seva-daily-section">
        <header className="seva-section-head">
          <div>
            <h3>Daily seva</h3>
            <p className="muted seva-section-desc-desktop">
              All days at once. Today’s column is highlighted.
            </p>
            <p className="muted seva-section-desc-mobile">
              Pick a day to see duties. Today is marked.
            </p>
          </div>
        </header>

        <SevaDayStrip
          weekDays={weekDays}
          selectedDayId={selectedDayId}
          todayId={todayId}
          onSelect={setSelectedDayId}
        />

        <div className="seva-week-board-mobile">
          {mobileDay && (
            <SevaDayColumn
              day={mobileDay}
              config={config}
              linkedPerson={linkedPerson}
              isToday={mobileDay.id === todayId}
            />
          )}
        </div>

        <div className="seva-week-board seva-week-board-desktop">
          {weekDays.map((day) => (
            <SevaDayColumn
              key={day.id}
              day={day}
              config={config}
              linkedPerson={linkedPerson}
              isToday={day.id === todayId}
            />
          ))}
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
    </div>
  )
}
