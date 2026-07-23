import { useState } from 'react'
import { getSevaGroupIcon, getSevaToneClass } from '../../utils/sevaIconMap'
import { SevaDayStrip } from './SevaDayStrip'
import { SevaPersonChipFromId } from './SevaPersonChip'
import { SevaPersonPicker } from './SevaPersonPicker'

function EditableSlot({
  slot,
  people,
  groupId,
  dayId,
  slotIndex,
  onSelectPerson,
  onClear,
  onEditNote,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const filled = !!(slot?.personId || slot?.note)

  return (
    <div className="seva-admin-mobile-slot">
      {!filled ? (
        <button
          type="button"
          className="seva-chip seva-chip-empty seva-slot-add"
          onClick={() => setPickerOpen(true)}
        >
          + Add
        </button>
      ) : (
        <>
          <SevaPersonChipFromId
            people={people}
            personId={slot.personId}
            note={slot.note}
            editable
            dragPayload={{
              from: { dayId, groupId, slotIndex, personId: slot.personId, note: slot.note },
            }}
            onRemove={onClear}
          />
          {slot.personId && (
            <input
              type="text"
              className="seva-slot-note"
              placeholder="Note (e.g. outside)"
              value={slot.note ?? ''}
              onChange={(e) => onEditNote(e.target.value)}
            />
          )}
        </>
      )}
      {pickerOpen && (
        <SevaPersonPicker
          people={people}
          onSelect={(personId) => {
            onSelectPerson(personId)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}

function AdminDayColumn({
  day,
  config,
  onSelectPerson,
  onClearSlot,
  onEditSlotNote,
}) {
  const dayAssign = config.assignments?.[day.id] ?? {}

  return (
    <div className="seva-admin-mobile-day">
      <header className="seva-week-col-head">
        <span className="seva-week-col-label">{day.label}</span>
      </header>
      <div className="seva-admin-mobile-cards">
        {(config.dailyGroups ?? []).map((group, index) => {
          const slots = dayAssign[group.id] ?? []
          const slotCols = Math.max(1, group.slotCount ?? 1)
          const Icon = getSevaGroupIcon(group.code)
          const toneClass = getSevaToneClass(group, index)

          return (
            <article key={group.id} className="seva-duty-card is-compact">
              <header className="seva-duty-card-head">
                <span className={`seva-duty-icon ${toneClass}`} aria-hidden>
                  <Icon size={16} />
                </span>
                <div className="seva-duty-titles">
                  <span className={`seva-duty-code ${toneClass}`}>{group.code}</span>
                </div>
              </header>
              <div className="seva-admin-mobile-slots">
                {Array.from({ length: slotCols }, (_, i) => {
                  const slot = slots[i] ?? { personId: null, note: '' }
                  return (
                    <EditableSlot
                      key={`${group.id}-${i}`}
                      slot={slot}
                      people={config.people}
                      groupId={group.id}
                      dayId={day.id}
                      slotIndex={i}
                      onSelectPerson={(personId) =>
                        onSelectPerson(day.id, group.id, i, personId)
                      }
                      onClear={() => onClearSlot(day.id, group.id, i)}
                      onEditNote={(note) => onEditSlotNote(day.id, group.id, i, note)}
                    />
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function SevaAdminMobileSchedule({
  config,
  selectedDayId,
  todayId,
  onSelectDay,
  onSelectPerson,
  onClearSlot,
  onEditSlotNote,
}) {
  const weekDays = config?.weekDays ?? []
  const mobileDay = weekDays.find((d) => d.id === selectedDayId) ?? weekDays[0]

  return (
    <section className="seva-admin-mobile-section">
      <SevaDayStrip
        weekDays={weekDays}
        selectedDayId={selectedDayId}
        todayId={todayId}
        onSelect={onSelectDay}
      />
      {mobileDay && (
        <AdminDayColumn
          day={mobileDay}
          config={config}
          onSelectPerson={onSelectPerson}
          onClearSlot={onClearSlot}
          onEditSlotNote={onEditSlotNote}
        />
      )}
    </section>
  )
}
