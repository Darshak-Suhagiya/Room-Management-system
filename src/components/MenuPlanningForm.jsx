import { useEffect, useState } from 'react'
import { Info as IconInfo, X as IconX } from 'lucide-react'
import { MEAL_SLOTS, emptyMealSlot } from '../config/menuItems'
import { useToast } from '../contexts/ToastContext'
import { validateMenuPlan } from '../utils/validateMenuPlan'
import {
  REVIEW_RATINGS,
  REVIEW_RATING_LABELS,
  sentimentIndicator,
} from '../utils/menuReviewUtils'
import { formatDisplayDateGu } from '../utils/mealDateUtils'
import { getPlanningViewSections } from '../utils/planningViewGroups'

function ItemChip({
  item,
  selected,
  onToggle,
  cookCounts = {},
  sentimentByItem = {},
}) {
  const count = cookCounts[item.id] ?? 0
  const sentiment = sentimentIndicator(sentimentByItem[item.id])
  return (
    <label className="checkbox-chip">
      <input
        type="checkbox"
        checked={selected.includes(item.id)}
        onChange={() => onToggle(item.id)}
      />
      <span className="chip-label-row">
        <span>{item.gu}</span>
        {count > 0 && (
          <small className="cook-count" title="Times cooked in last 2 months">
            ×{count}
          </small>
        )}
        {sentiment === REVIEW_RATINGS.GOOD && (
          <span
            className="sentiment-dot sentiment-good"
            title="Mostly good reviews"
          />
        )}
        {sentiment === REVIEW_RATINGS.BAD && (
          <span
            className="sentiment-dot sentiment-bad"
            title="Mostly bad reviews"
          />
        )}
      </span>
    </label>
  )
}

function CategoryPicker({
  category,
  items,
  selected,
  onChange,
  cookCounts = {},
  sentimentByItem = {},
}) {
  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id]
    onChange(next)
  }

  if (items.length === 0) return null

  const sections = getPlanningViewSections(category, items)
  const useGroups = (category.planningGroups ?? []).length > 0

  return (
    <fieldset className="category-picker">
      <legend>{category.labelGu}</legend>
      {useGroups ? (
        <div className="planning-view-groups">
          {sections.map((section) => (
            <div key={section.id ?? 'flat'} className="planning-view-group">
              {section.label ? (
                <h4 className="planning-view-group-title">{section.label}</h4>
              ) : null}
              <div className="checkbox-grid">
                {section.items.map((item) => (
                  <ItemChip
                    key={item.id}
                    item={item}
                    selected={selected}
                    onToggle={toggle}
                    cookCounts={cookCounts}
                    sentimentByItem={sentimentByItem}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="checkbox-grid">
          {items.map((item) => (
            <ItemChip
              key={item.id}
              item={item}
              selected={selected}
              onToggle={toggle}
              cookCounts={cookCounts}
              sentimentByItem={sentimentByItem}
            />
          ))}
        </div>
      )}
    </fieldset>
  )
}

function SlotNoteFields({
  everyoneNote,
  maharajNote,
  onEveryoneChange,
  onMaharajChange,
  slotLabel,
}) {
  return (
    <div className="slot-note-fields">
      <label className="field-stack">
        <span className="field-stack-label">Note for everyone (optional)</span>
        <textarea
          className="app-textarea"
          rows={2}
          value={everyoneNote}
          placeholder={`Message shown on ${slotLabel.toLowerCase()} menu…`}
          onChange={(e) => onEveryoneChange(e.target.value)}
        />
      </label>
      <label className="field-stack">
        <span className="field-stack-label">Note for Maharaj (optional)</span>
        <textarea
          className="app-textarea"
          rows={2}
          value={maharajNote}
          placeholder="Cook-only note on the vote dashboard…"
          onChange={(e) => onMaharajChange(e.target.value)}
        />
      </label>
    </div>
  )
}

function SlotEditor({
  slotKey,
  catalog,
  value,
  note,
  maharajNote,
  onChange,
  onNoteChange,
  onMaharajNoteChange,
  cookCounts,
  sentimentByItem,
}) {
  const slot = MEAL_SLOTS[slotKey]
  return (
    <section className="slot-editor">
      <h3>{slot.labelEn}</h3>
      <SlotNoteFields
        everyoneNote={note}
        maharajNote={maharajNote}
        onEveryoneChange={onNoteChange}
        onMaharajChange={onMaharajNoteChange}
        slotLabel={slot.labelEn}
      />
      {catalog.categories.map((cat) => (
        <CategoryPicker
          key={cat.id}
          category={cat}
          items={catalog.itemsByCategory[cat.id] ?? []}
          selected={value[cat.id] ?? []}
          onChange={(ids) => onChange({ ...value, [cat.id]: ids })}
          cookCounts={cookCounts}
          sentimentByItem={sentimentByItem}
        />
      ))}
    </section>
  )
}

export function MenuPlanningForm({
  dateId,
  initialMenu,
  catalog,
  categoryIds,
  onSave,
  saving,
  cookCounts = {},
  sentimentByItem = {},
  onDraftChange,
}) {
  const toast = useToast()
  const [hasMorning, setHasMorning] = useState(false)
  const [hasEvening, setHasEvening] = useState(false)
  const [morning, setMorning] = useState(() => emptyMealSlot(categoryIds))
  const [evening, setEvening] = useState(() => emptyMealSlot(categoryIds))
  const [morningNote, setMorningNote] = useState('')
  const [eveningNote, setEveningNote] = useState('')
  const [morningMaharajNote, setMorningMaharajNote] = useState('')
  const [eveningMaharajNote, setEveningMaharajNote] = useState('')

  useEffect(() => {
    setHasMorning(initialMenu?.hasMorning ?? false)
    setHasEvening(initialMenu?.hasEvening ?? false)
    setMorning(initialMenu?.morning ?? emptyMealSlot(categoryIds))
    setEvening(initialMenu?.evening ?? emptyMealSlot(categoryIds))
    setMorningNote(initialMenu?.morningNote ?? '')
    setEveningNote(initialMenu?.eveningNote ?? '')
    setMorningMaharajNote(initialMenu?.morningMaharajNote ?? '')
    setEveningMaharajNote(initialMenu?.eveningMaharajNote ?? '')
  }, [initialMenu, dateId, categoryIds])

  useEffect(() => {
    onDraftChange?.({
      hasMorning,
      hasEvening,
      morning: hasMorning ? morning : null,
      evening: hasEvening ? evening : null,
      morningNote,
      eveningNote,
      morningMaharajNote,
      eveningMaharajNote,
    })
  }, [
    hasMorning,
    hasEvening,
    morning,
    evening,
    morningNote,
    eveningNote,
    morningMaharajNote,
    eveningMaharajNote,
    onDraftChange,
  ])

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationError = validateMenuPlan({
      hasMorning,
      hasEvening,
      morning,
      evening,
      categoryIds,
    })
    if (validationError) {
      toast.error(validationError)
      return
    }
    onSave({
      hasMorning,
      hasEvening,
      morning,
      evening,
      morningNote,
      eveningNote,
      morningMaharajNote,
      eveningMaharajNote,
    })
  }

  return (
    <form className="menu-form" onSubmit={handleSubmit}>
      <div className="slot-toggles">
        <label className="slot-toggle">
          <input
            type="checkbox"
            checked={hasMorning}
            onChange={(e) => setHasMorning(e.target.checked)}
          />
          <span>Morning</span>
        </label>
        <label className="slot-toggle">
          <input
            type="checkbox"
            checked={hasEvening}
            onChange={(e) => setHasEvening(e.target.checked)}
          />
          <span>Evening</span>
        </label>
      </div>

      {!hasMorning && !hasEvening && (
        <p className="muted">Select morning and/or evening for this date.</p>
      )}

      {hasMorning && (
        <SlotEditor
          slotKey="morning"
          catalog={catalog}
          value={morning}
          note={morningNote}
          maharajNote={morningMaharajNote}
          onChange={setMorning}
          onNoteChange={setMorningNote}
          onMaharajNoteChange={setMorningMaharajNote}
          cookCounts={cookCounts}
          sentimentByItem={sentimentByItem}
        />
      )}

      {hasEvening && (
        <SlotEditor
          slotKey="evening"
          catalog={catalog}
          value={evening}
          note={eveningNote}
          maharajNote={eveningMaharajNote}
          onChange={setEvening}
          onNoteChange={setEveningNote}
          onMaharajNoteChange={setEveningMaharajNote}
          cookCounts={cookCounts}
          sentimentByItem={sentimentByItem}
        />
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || (!hasMorning && !hasEvening)}
        >
          {saving ? 'Saving…' : 'Save plan'}
        </button>
      </div>
    </form>
  )
}

function summarizeHistoryRatings(history) {
  let good = 0
  let okay = 0
  let bad = 0
  for (const occ of history ?? []) {
    for (const r of occ.reviews ?? []) {
      if (r.rating === REVIEW_RATINGS.GOOD) good += 1
      else if (r.rating === REVIEW_RATINGS.OKAY) okay += 1
      else if (r.rating === REVIEW_RATINGS.BAD) bad += 1
    }
  }
  return { good, okay, bad, total: good + okay + bad }
}

function ItemFeedbackHistoryModal({ item, history, onClose }) {
  if (!item) return null

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="modal-dialog modal-dialog-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-feedback-history-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="item-feedback-history-title">{item.gu}</h2>
            <p className="modal-subtitle">
              Last {history.length || 0} cook{history.length === 1 ? '' : 's'} — person reviews
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <IconX size={18} />
          </button>
        </header>
        <div className="modal-body">
          {history.length === 0 ? (
            <p className="muted">No past cook history for this dish yet.</p>
          ) : (
            <ul className="plan-feedback-history plan-feedback-history-modal">
              {history.map((occ) => (
                <li key={`${occ.date}-${occ.slot}`} className="plan-feedback-occasion">
                  <h3 className="plan-feedback-date">
                    {formatDisplayDateGu(occ.date)} ·{' '}
                    {MEAL_SLOTS[occ.slot]?.labelEn ?? occ.slot}
                  </h3>
                  {occ.reviews.length === 0 ? (
                    <p className="muted">No reviews that day.</p>
                  ) : (
                    <ul className="plan-feedback-reviews">
                      {occ.reviews.map((r) => (
                        <li key={r.userId} className="plan-feedback-person">
                          <div className="plan-feedback-who-row">
                            <span className="plan-feedback-who">{r.displayName}</span>
                            {r.rating && (
                              <span className={`review-rating-badge rating-${r.rating}`}>
                                {REVIEW_RATING_LABELS[r.rating]}
                              </span>
                            )}
                          </div>
                          {r.text ? (
                            <p className="plan-feedback-text">{r.text}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

/** Left-panel preview: good/bad counts + info popup for last 5 date/person reviews. */
export function PlanningSelectionPreview({
  draft,
  catalog,
  itemHistoryById = {},
}) {
  const [detail, setDetail] = useState(null)

  const slots = []
  if (draft?.hasMorning && draft.morning) {
    slots.push({ key: 'morning', label: MEAL_SLOTS.morning.labelEn, data: draft.morning })
  }
  if (draft?.hasEvening && draft.evening) {
    slots.push({ key: 'evening', label: MEAL_SLOTS.evening.labelEn, data: draft.evening })
  }

  if (slots.length === 0) {
    return <p className="muted">Select dishes on the right to preview feedback history.</p>
  }

  return (
    <div className="planning-selection-preview">
      {slots.map(({ key, label, data }) => (
        <section key={key} className={`plan-preview-slot slot-panel-${key}`}>
          <h4>{label}</h4>
          {catalog.categories.map((cat) => {
            const ids = data[cat.id] ?? []
            if (ids.length === 0) return null
            return (
              <div key={cat.id} className="plan-preview-category">
                <h5>{cat.labelGu}</h5>
                <ul className="plan-preview-items">
                  {ids.map((id) => {
                    const item = catalog.items.find((i) => i.id === id)
                    const history = itemHistoryById[id] ?? []
                    const counts = summarizeHistoryRatings(history)
                    const hasHistory = history.length > 0
                    return (
                      <li key={id} className="plan-preview-item">
                        <div className="plan-preview-item-row">
                          <strong className="plan-preview-item-name">
                            {item?.gu ?? id}
                          </strong>
                          {hasHistory && (
                            <button
                              type="button"
                              className="cook-item-info-btn"
                              title="View last 5 cooks’ reviews"
                              aria-label={`Reviews for ${item?.gu ?? id}`}
                              onClick={() =>
                                setDetail({
                                  item: item ?? { id, gu: id },
                                  history,
                                })
                              }
                            >
                              <IconInfo size={16} />
                            </button>
                          )}
                        </div>
                        {!hasHistory ? (
                          <p className="muted plan-preview-counts">No past feedback yet.</p>
                        ) : counts.total === 0 ? (
                          <p className="muted plan-preview-counts">
                            Cooked {history.length} time{history.length === 1 ? '' : 's'} — no ratings yet.
                          </p>
                        ) : (
                          <div className="plan-preview-counts" aria-label="Review counts">
                            <span className="review-count-pill rating-good">
                              Good {counts.good}
                            </span>
                            <span className="review-count-pill rating-okay">
                              Okay {counts.okay}
                            </span>
                            <span className="review-count-pill rating-bad">
                              Bad {counts.bad}
                            </span>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </section>
      ))}

      {detail && (
        <ItemFeedbackHistoryModal
          item={detail.item}
          history={detail.history}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
