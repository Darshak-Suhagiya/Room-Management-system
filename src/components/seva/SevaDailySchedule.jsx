import { SevaDropSlot } from './SevaDropSlot'

export function SevaDailySchedule({
  config,
  editable,
  onAssignSlot,
  onSelectPerson,
  onClearSlot,
  onEditSlotNote,
  onAddColumn,
  onRemoveColumn,
}) {
  const { weekDays, dailyGroups, assignments, people } = config
  const slotCols = Math.max(
    1,
    ...dailyGroups.map((g) => g.slotCount ?? 1),
  )

  const handleDrop = (dayId, groupId, slotIndex, payload) => {
    const personId = payload.personId ?? payload.from?.personId
    const note = payload.note ?? payload.from?.note ?? ''
    onAssignSlot(dayId, groupId, slotIndex, personId, note, payload.from)
  }

  return (
    <section className="seva-section seva-daily-section">
      <div className="seva-section-head">
        <h3 className="seva-section-title">S1 – S4 distribution (daily)</h3>
        {editable && (
          <div className="seva-column-controls seva-no-print">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onRemoveColumn}
              disabled={slotCols <= 1}
            >
              − Column
            </button>
            <span className="muted">{slotCols} columns</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onAddColumn}
            >
              + Column
            </button>
          </div>
        )}
      </div>
      <table className="seva-table seva-schedule-table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Seva</th>
            {Array.from({ length: slotCols }, (_, i) => (
              <th key={i}>Member {i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekDays.map((day) =>
            dailyGroups.map((group, rowIdx) => {
              const slots = assignments[day.id]?.[group.id] ?? []
              return (
                <tr key={`${day.id}-${group.id}`}>
                  {rowIdx === 0 && (
                    <th
                      rowSpan={dailyGroups.length}
                      className="seva-day-cell"
                    >
                      {day.label}
                    </th>
                  )}
                  <th className="seva-code-cell">{group.code}</th>
                  {Array.from({ length: slotCols }, (_, i) => {
                    const slot = slots[i] ?? { personId: null, note: '' }
                    return (
                      <SevaDropSlot
                        key={i}
                        slot={slot}
                        people={people}
                        editable={editable}
                        dragPayload={{
                          personId: slot.personId,
                          note: slot.note,
                          from: {
                            type: 'daily',
                            dayId: day.id,
                            groupId: group.id,
                            slotIndex: i,
                          },
                        }}
                        onDropPerson={(payload) =>
                          handleDrop(day.id, group.id, i, payload)
                        }
                        onSelectPerson={(personId) =>
                          onSelectPerson(day.id, group.id, i, personId)
                        }
                        onClear={() => onClearSlot(day.id, group.id, i)}
                        onEditNote={(note) =>
                          onEditSlotNote(day.id, group.id, i, note)
                        }
                      />
                    )
                  })}
                </tr>
              )
            }),
          )}
        </tbody>
      </table>
    </section>
  )
}
