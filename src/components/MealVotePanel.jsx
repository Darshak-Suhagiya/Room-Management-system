import { useEffect, useMemo, useState } from 'react'
import { MEAL_SLOTS } from '../config/menuItems'
import { VOTE_TYPES } from '../config/voteTypes'
import {
  formatVoteDisplay,
  getInvalidVoteItemIds,
  getMissingVoteItemIds,
  getPlannedMenuItems,
  getVoteValue,
  hasMealVoteComplete,
} from '../utils/menuVoteUtils'
import { groupPlannedByCategory } from '../utils/groupMenuByCategory'
import { isPastDate } from '../utils/mealDateUtils'
import { getItemReview, collectSlotItemReviews } from '../utils/menuReviewUtils'
import { parseQuantityInput } from '../utils/voteQuantityUtils'
import { MenuSlotNote } from './MenuSlotNote'
import { MobileMealVoteView } from './meals/mobile/MobileMealVoteView'
import {
  MealFeedbackEntryRow,
  MealFeedbackSheet,
  getFeedbackProgress,
} from './meals/mobile'
import {
  MealItemReviewEditor,
  OthersItemReviews,
} from './MealItemReview'
import {
  saveMealParticipation,
  subscribeMealParticipation,
  subscribeParticipationsForSlot,
} from '../services/participationService'
import { useToast } from '../contexts/ToastContext'
import {
  Edit3 as IconEdit,
  Lock as IconLock,
  Moon as IconMoon,
  RefreshCw as IconRefresh,
  Save as IconSave,
  Sun as IconSun,
} from 'lucide-react'

const CAT_TONES = ['cat-tone-0', 'cat-tone-1', 'cat-tone-2', 'cat-tone-3', 'cat-tone-4']

function VoteInput({ item, value, onChange, disabled, hasError, slot }) {
  if (item.voteType === VOTE_TYPES.INTEGER) {
    return (
      <input
        type="number"
        className={`vote-inline-input vote-inline-num vote-qty-input ${hasError ? 'vote-input-error' : ''}`}
        min={0}
        step={0.5}
        inputMode="decimal"
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(parseQuantityInput(e.target.value))}
      />
    )
  }

  const yesActive = value === true
  const noActive = value === false

  return (
    <div
      className={`vote-yesno vote-yesno-inline slot-${slot} ${hasError ? 'vote-input-error-wrap' : ''}`}
    >
      <button
        type="button"
        className={`btn-vote btn-vote-yes ${yesActive ? 'is-active' : ''}`}
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        Yes
      </button>
      <button
        type="button"
        className={`btn-vote btn-vote-no ${noActive ? 'is-active' : ''}`}
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        No
      </button>
    </div>
  )
}

function CategoryMenuList({ grouped, renderItem }) {
  return grouped.map(({ category, items }, catIndex) => (
    <div
      key={category.id}
      className={`menu-category-block ${catIndex > 0 ? 'has-separator' : ''}`}
    >
      <h4
        className={`menu-category-title ${CAT_TONES[catIndex % CAT_TONES.length]}`}
      >
        {category.labelGu}
      </h4>
      <ul className="menu-vote-list">
        {items.map((item, itemIndex) => (
          <li
            key={item.id}
            className={itemIndex < items.length - 1 ? 'has-item-separator' : ''}
          >
            {renderItem(item)}
          </li>
        ))}
      </ul>
    </div>
  ))
}

export function MealVotePanel({
  userId,
  dateId,
  slot,
  menu,
  catalog,
  locked = false,
  refreshing = false,
  onRefresh,
  displayName = '',
  canReview = true,
  showOthersFeedback = false,
  onToggleOthersFeedback,
  mobile = false,
}) {
  const slotInfo = MEAL_SLOTS[slot]
  const SlotIcon = slot === 'morning' ? IconSun : IconMoon
  const slotNote =
    slot === 'morning' ? menu?.morningNote : menu?.eveningNote
  const plannedItems = getPlannedMenuItems(menu, slot, catalog)
  const grouped = useMemo(
    () => groupPlannedByCategory(plannedItems, catalog),
    [plannedItems, catalog],
  )

  const past = isPastDate(dateId)
  const readOnly = past || locked
  const blockReason = past
    ? 'Past date — votes cannot be changed'
    : locked
      ? 'Votes locked by admin'
      : null

  const [participation, setParticipation] = useState(null)
  const [slotParticipations, setSlotParticipations] = useState([])
  const [notEating, setNotEating] = useState(false)
  const [votes, setVotes] = useState({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [missingIds, setMissingIds] = useState([])
  const [invalidIds, setInvalidIds] = useState([])
  const [feedbackSheetOpen, setFeedbackSheetOpen] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (!userId) return undefined
    setHydrated(false)
    return subscribeMealParticipation(userId, dateId, slot, (data) => {
      setParticipation(data)
      setNotEating(Boolean(data?.notEating))
      setVotes(data?.votes ?? {})
      setHydrated(true)
    })
  }, [userId, dateId, slot])

  useEffect(() => {
    // Load everyone else's reviews whenever reviews are allowed — no vote required to read.
    if (!canReview) {
      setSlotParticipations([])
      return undefined
    }
    return subscribeParticipationsForSlot(dateId, slot, setSlotParticipations)
  }, [dateId, slot, canReview])

  const othersParticipations = canReview ? slotParticipations : []

  const isComplete =
    hydrated && hasMealVoteComplete(participation, plannedItems)
  const showForm = !readOnly && (!isComplete || editing)
  // Leave your own review only after a complete "eating" vote (while not editing votes)
  const canLeaveOwnReview =
    canReview && isComplete && !notEating && !showForm
  // Anyone with review access can browse feedback (toggle optional for clutter)
  const showFeedbackSection = canReview && hydrated
  const showOthersInSection = showFeedbackSection && showOthersFeedback

  useEffect(() => {
    setEditing(false)
    setMessage('')
    setMissingIds([])
    setInvalidIds([])
  }, [dateId, slot, locked])

  const handleSave = async () => {
    if (readOnly) return

    const invalid = getInvalidVoteItemIds(plannedItems, votes, notEating)
    if (invalid.length > 0) {
      setInvalidIds(invalid)
      setMissingIds([])
      toast.error('Invalid value. Use numbers in steps of 0.5 (e.g. 1, 1.5, 2).')
      return
    }

    const missing = getMissingVoteItemIds(plannedItems, votes, notEating)
    if (missing.length > 0) {
      setMissingIds(missing)
      setInvalidIds([])
      toast.error('Please answer every menu item before saving.')
      return
    }

    setSaving(true)
    setMessage('')
    setMissingIds([])
    setInvalidIds([])
    try {
      const votePayload = {}
      if (!notEating) {
        for (const item of plannedItems) {
          const raw = votes[item.id]
          const val =
            raw && typeof raw === 'object' && 'value' in raw ? raw.value : raw
          votePayload[item.id] = {
            voteType: item.voteType,
            value: val,
          }
        }
      }
      await saveMealParticipation({
        userId,
        dateId,
        slot,
        notEating,
        votes: votePayload,
      })
      setMessage('Saved')
      toast.success('Vote saved')
      setEditing(false)
    } catch (err) {
      setMessage(err.message)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateVote = (itemId, voteType, val) => {
    setVotes((prev) => ({
      ...prev,
      [itemId]: { voteType, value: val },
    }))
    setMissingIds((prev) => prev.filter((id) => id !== itemId))
    setInvalidIds((prev) => prev.filter((id) => id !== itemId))
  }

  if (plannedItems.length === 0) return null

  const voteStatusClass = !hydrated
    ? ''
    : isComplete
      ? 'vote-status-done'
      : 'vote-status-pending'

  const renderFeedbackSection = () => {
    if (!showFeedbackSection || plannedItems.length === 0) return null

    if (mobile) {
      const { ratedCount, totalCount } = getFeedbackProgress(
        plannedItems,
        participation,
      )
      const canOpenSheet = canLeaveOwnReview || showOthersFeedback

      return (
        <>
          <MealFeedbackEntryRow
            ratedCount={ratedCount}
            totalCount={canLeaveOwnReview ? totalCount : 0}
            onOpen={() => setFeedbackSheetOpen(true)}
            disabled={!canOpenSheet}
            hint={
              !canOpenSheet ? 'Vote first to leave feedback' : undefined
            }
          />
          <MealFeedbackSheet
            open={feedbackSheetOpen}
            onClose={() => setFeedbackSheetOpen(false)}
            slotLabel={slotInfo.labelEn}
            canReview={canReview}
            canLeaveOwnReview={canLeaveOwnReview}
            showOthersFeedback={showOthersFeedback}
            onToggleOthersFeedback={onToggleOthersFeedback}
            plannedItems={plannedItems}
            participation={participation}
            othersParticipations={othersParticipations}
            userId={userId}
            dateId={dateId}
            slot={slot}
            displayName={displayName}
          />
        </>
      )
    }

    return (
      <section className="meal-feedback-section" aria-label="Reviews and feedback">
        <div className="meal-feedback-separator" aria-hidden />
        <header className="meal-feedback-head">
          <h4 className="meal-feedback-title">Reviews &amp; feedback</h4>
          <p className="muted meal-feedback-sub">
            {canLeaveOwnReview
              ? 'Rate dishes you ate, and read what others shared.'
              : showOthersInSection
                ? 'Everyone’s feedback for this meal — vote first if you want to leave your own.'
                : 'Turn on “Show everyone’s feedback” in Quick links to read reviews.'}
          </p>
        </header>
        <ul className="meal-feedback-list">
          {plannedItems.map((item) => {
            const ownReview = getItemReview(participation?.reviews, item.id)
            const others = collectSlotItemReviews(othersParticipations, item.id)
            return (
              <li key={item.id} className="meal-feedback-item">
                <div className="meal-feedback-item-name">{item.gu}</div>
                {canLeaveOwnReview ? (
                  <MealItemReviewEditor
                    key={`${item.id}-${ownReview?.updatedAt ?? 'new'}`}
                    userId={userId}
                    dateId={dateId}
                    slot={slot}
                    itemId={item.id}
                    displayName={displayName}
                    review={ownReview}
                    mobile={mobile}
                  />
                ) : null}
                {showOthersInSection ? (
                  <div className="review-others-wrap">
                    <span className="review-others-label">Everyone’s feedback</span>
                    <OthersItemReviews reviews={others} currentUserId={userId} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  const renderVoteActions = (sticky = false) => (
    <div className={`vote-actions ${sticky ? 'vote-actions-sticky' : ''}`}>
      <button
        type="button"
        className={`btn btn-primary btn-sm btn-save slot-btn-${slot}`}
        onClick={handleSave}
        disabled={saving}
      >
        <IconSave size={16} />
        {saving ? 'Saving…' : 'Save'}
      </button>
      {isComplete && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setNotEating(Boolean(participation?.notEating))
            setVotes(participation?.votes ?? {})
            setEditing(false)
            setMissingIds([])
          }}
          disabled={saving}
        >
          Cancel
        </button>
      )}
      {message && <span className="vote-msg">{message}</span>}
    </div>
  )

  if (mobile) {
    return (
      <MobileMealVoteView
        slot={slot}
        slotLabel={slotInfo.labelEn}
        slotNote={slotNote}
        grouped={grouped}
        hydrated={hydrated}
        isComplete={isComplete}
        showForm={showForm}
        readOnly={readOnly}
        locked={locked}
        past={past}
        blockReason={blockReason}
        notEating={notEating}
        votes={votes}
        missingIds={missingIds}
        invalidIds={invalidIds}
        saving={saving}
        message={message}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onNotEatingChange={(next) => {
          setNotEating(next)
          setMissingIds([])
        }}
        onUpdateVote={updateVote}
        onSave={handleSave}
        onCancelEdit={() => {
          setNotEating(Boolean(participation?.notEating))
          setVotes(participation?.votes ?? {})
          setEditing(false)
          setMissingIds([])
        }}
        onStartEdit={() => setEditing(true)}
        renderFeedbackSection={renderFeedbackSection}
      />
    )
  }

  return (
    <article
      className={`meal-vote-panel slot-panel-${slot} ${voteStatusClass} ${locked ? 'is-locked' : ''} ${past ? 'is-past' : ''}`}
    >
      <header className="slot-card-header">
        <div className="slot-card-title">
          <SlotIcon size={20} className={`slot-icon slot-icon-${slot}`} />
          <h3>{slotInfo.labelEn}</h3>
          {hydrated && (
            <span
              className={`vote-status-pill ${isComplete ? 'is-done' : 'is-pending'}`}
            >
              {isComplete ? 'Voted' : 'Not voted'}
            </span>
          )}
        </div>
        <div className="slot-card-actions">
          {locked && (
            <span className="lock-badge">
              <IconLock size={14} />
              Locked
            </span>
          )}
          {onRefresh && (
            <button
              type="button"
              className="btn btn-icon btn-ghost slot-card-refresh"
              disabled={refreshing}
              onClick={() => onRefresh()}
              title="Refresh menu and votes"
              aria-label="Refresh"
            >
              <IconRefresh size={18} className={refreshing ? 'spin' : ''} />
            </button>
          )}
          {isComplete && !showForm && !readOnly && (
            <button
              type="button"
              className="btn-edit-corner"
              onClick={() => setEditing(true)}
            >
              <IconEdit size={14} />
              Edit
            </button>
          )}
        </div>
      </header>

      <MenuSlotNote note={slotNote} slot={slot} />

      {blockReason && (
        <p className="vote-block-notice">{blockReason}</p>
      )}

      {!hydrated ? (
        <p className="muted">Loading…</p>
      ) : showForm ? (
        <>
          <div className={`eating-toggle slot-${slot}`} role="group" aria-label="Meal attendance">
            <button
              type="button"
              className={`eating-toggle-btn ${!notEating ? 'is-active' : ''}`}
              disabled={saving}
              onClick={() => {
                setNotEating(false)
                setMissingIds([])
              }}
            >
              Eating
            </button>
            <button
              type="button"
              className={`eating-toggle-btn ${notEating ? 'is-active' : ''}`}
              disabled={saving}
              onClick={() => {
                setNotEating(true)
                setMissingIds([])
              }}
            >
              Not Eating
            </button>
          </div>

          {!notEating && (
            <CategoryMenuList
              grouped={grouped}
              renderItem={(item) => {
                const missing = missingIds.includes(item.id)
                const invalid = invalidIds.includes(item.id)
                return (
                  <div
                    className={`menu-item-with-vote ${invalid ? 'vote-row-invalid' : ''} ${missing ? 'vote-row-missing' : ''}`}
                  >
                    <span className="menu-item-name">{item.gu}</span>
                    <VoteInput
                      item={item}
                      slot={slot}
                      value={getVoteValue(votes, item.id)}
                      hasError={invalid || missing}
                      onChange={(val) => updateVote(item.id, item.voteType, val)}
                      disabled={saving}
                    />
                    {invalid && (
                      <span className="vote-missing-hint">Invalid value</span>
                    )}
                    {missing && !invalid && (
                      <span className="vote-missing-hint">Required</span>
                    )}
                  </div>
                )
              }}
            />
          )}

          {renderVoteActions(false)}
        </>
      ) : (
        <>
          {notEating ? (
            <p className="vote-summary-status not-eating">Not eating</p>
          ) : (
            <CategoryMenuList
              grouped={grouped}
              renderItem={(item) => (
                <div className="menu-item-with-vote">
                  <span className="menu-item-name">{item.gu}</span>
                  <span
                    className={`vote-badge ${
                      getVoteValue(votes, item.id) === false
                        ? 'vote-no'
                        : 'vote-yes'
                    }`}
                  >
                    {formatVoteDisplay(item, getVoteValue(votes, item.id))}
                  </span>
                </div>
              )}
            />
          )}
        </>
      )}

      {renderFeedbackSection()}
    </article>
  )
}
