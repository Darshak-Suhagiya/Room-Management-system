import { useState } from 'react'
import { MEAL_SLOTS } from '../../../config/menuItems'
import { useMenuPlanForm } from '../../../hooks/useMenuPlanForm'
import { PlanningCategorySection } from './PlanningCategorySection'
import { PlanningSlotEmpty, PlanningSlotSegment } from './PlanningSlotSegment'
import { PlanningStockMobilePanel } from './PlanningStockMobilePanel'

function SlotNotes({
  slotLabel,
  everyoneNote,
  maharajNote,
  onEveryoneChange,
  onMaharajChange,
}) {
  const [open, setOpen] = useState(
    Boolean(everyoneNote?.trim() || maharajNote?.trim()),
  )

  return (
    <details
      className="admin-mobile-plan-notes"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>{slotLabel} notes {!open && '(optional)'}</summary>
      {open && (
        <div className="admin-mobile-plan-notes-body">
          <label className="field-stack">
            <span className="field-stack-label">Note for everyone</span>
            <textarea
              className="app-textarea"
              rows={2}
              value={everyoneNote}
              placeholder={`Message shown on ${slotLabel.toLowerCase()} menu…`}
              onChange={(e) => onEveryoneChange(e.target.value)}
            />
          </label>
          <label className="field-stack">
            <span className="field-stack-label">Note for Maharaj</span>
            <textarea
              className="app-textarea"
              rows={2}
              value={maharajNote}
              placeholder="Cook-only note on the vote dashboard…"
              onChange={(e) => onMaharajChange(e.target.value)}
            />
          </label>
        </div>
      )}
    </details>
  )
}

export function PlanningMobileForm({
  formId,
  dateId,
  initialMenu,
  catalog,
  categoryIds,
  onSave,
  saving,
  cookCounts = {},
  sentimentByItem = {},
  onDraftChange,
  onDirtyChange,
  activeSlot,
  onActiveSlotChange,
}) {
  const form = useMenuPlanForm({
    dateId,
    initialMenu,
    categoryIds,
    onSave,
    onDraftChange,
    onDirtyChange,
  })

  const slotKey = activeSlot
  const slotEnabled = slotKey === 'morning' ? form.hasMorning : form.hasEvening
  const slotData = slotKey === 'morning' ? form.morning : form.evening
  const slotLabel = MEAL_SLOTS[slotKey]?.labelEn ?? slotKey
  const linkedItems =
    slotKey === 'morning' ? form.morningLinked : form.eveningLinked
  const usageMap =
    slotKey === 'morning' ? form.stockUsage.morning : form.stockUsage.evening

  const noteProps =
    slotKey === 'morning'
      ? {
          everyoneNote: form.morningNote,
          maharajNote: form.morningMaharajNote,
          onEveryoneChange: form.setMorningNote,
          onMaharajChange: form.setMorningMaharajNote,
        }
      : {
          everyoneNote: form.eveningNote,
          maharajNote: form.eveningMaharajNote,
          onEveryoneChange: form.setEveningNote,
          onMaharajChange: form.setEveningMaharajNote,
        }

  return (
    <form
      id={formId}
      className="admin-mobile-plan-form mobile-section-gap"
      onSubmit={form.handleSubmit}
    >
      {form.validationError && (
        <p className="form-error admin-mobile-plan-validation" role="alert">
          {form.validationError}
        </p>
      )}

      <PlanningSlotSegment
        activeSlot={activeSlot}
        hasMorning={form.hasMorning}
        hasEvening={form.hasEvening}
        onSelectSlot={onActiveSlotChange}
        onToggleSlot={form.setSlotEnabled}
      />

      {!form.hasMorning && !form.hasEvening && (
        <p className="muted">Enable morning and/or evening to plan this date.</p>
      )}

      {!slotEnabled && (form.hasMorning || form.hasEvening) && (
        <PlanningSlotEmpty
          slotKey={slotKey}
          onEnable={(key) => form.setSlotEnabled(key, true)}
        />
      )}

      {slotEnabled && (
        <>
          <SlotNotes slotLabel={slotLabel} {...noteProps} />

          <div className="admin-mobile-plan-categories">
            {catalog.categories.map((cat) => (
              <PlanningCategorySection
                key={cat.id}
                category={cat}
                items={catalog.itemsByCategory[cat.id] ?? []}
                selected={slotData[cat.id] ?? []}
                onToggle={(itemId) => form.toggleItem(slotKey, cat.id, itemId)}
                cookCounts={cookCounts}
                sentimentByItem={sentimentByItem}
              />
            ))}
          </div>

          <PlanningStockMobilePanel
            slotLabel={slotLabel}
            linkedItems={linkedItems}
            usageMap={usageMap}
            onChangeUsage={(itemId, qty) => form.setSlotUsage(slotKey, itemId, qty)}
          />
        </>
      )}

      {saving && <p className="muted">Saving plan…</p>}
    </form>
  )
}
