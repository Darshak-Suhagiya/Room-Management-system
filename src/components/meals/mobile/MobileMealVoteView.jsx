import { Save as IconSave } from 'lucide-react'
import { MenuSlotNote } from '../../MenuSlotNote'
import { MobileActionBar } from '../../ui/MobileActionBar'
import { getVoteValue } from '../../../utils/menuVoteUtils'
import { MobileMealVoteHeader } from './MobileMealVoteHeader'
import { MobileEatingSegment } from './MobileEatingSegment'
import { MobileVoteCategorySection } from './MobileVoteCategorySection'
import { MobileVoteSummary } from './MobileVoteSummary'

export function MobileMealVoteView({
  slot,
  slotLabel,
  slotNote,
  grouped,
  hydrated,
  isComplete,
  showForm,
  readOnly,
  locked,
  past,
  blockReason,
  notEating,
  votes,
  missingIds,
  invalidIds,
  saving,
  message,
  refreshing,
  onRefresh,
  onNotEatingChange,
  onUpdateVote,
  onSave,
  onCancelEdit,
  onStartEdit,
  renderFeedbackSection,
}) {
  const voteStatusClass = !hydrated
    ? ''
    : isComplete
      ? 'vote-status-done'
      : 'vote-status-pending'

  const renderVoteActions = () => (
    <div className="vote-actions vote-actions-sticky">
      <button
        type="button"
        className={`btn btn-primary btn-sm btn-save slot-btn-${slot}`}
        onClick={onSave}
        disabled={saving}
      >
        <IconSave size={16} />
        {saving ? 'Saving…' : 'Save'}
      </button>
      {isComplete && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancelEdit}
          disabled={saving}
        >
          Cancel
        </button>
      )}
      {message && <span className="vote-msg">{message}</span>}
    </div>
  )

  return (
    <article
      className={`meal-vote-mobile slot-panel-${slot} ${voteStatusClass} ${locked ? 'is-locked' : ''} ${past ? 'is-past' : ''}`}
    >
      <MobileMealVoteHeader
        slot={slot}
        slotLabel={slotLabel}
        hydrated={hydrated}
        isComplete={isComplete}
        locked={locked}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <MenuSlotNote note={slotNote} slot={slot} />

      {blockReason && <p className="vote-block-notice">{blockReason}</p>}

      {!hydrated ? (
        <p className="muted">Loading…</p>
      ) : showForm ? (
        <>
          <MobileEatingSegment
            notEating={notEating}
            onChange={onNotEatingChange}
            disabled={saving}
            slot={slot}
          />

          {!notEating &&
            grouped.map(({ category, items }, catIndex) => (
              <MobileVoteCategorySection
                key={category.id}
                category={category}
                catIndex={catIndex}
                items={items}
                slot={slot}
                votes={votes}
                missingIds={missingIds}
                invalidIds={invalidIds}
                onUpdateVote={onUpdateVote}
                disabled={saving}
                getVoteValue={getVoteValue}
              />
            ))}

          <MobileActionBar open={showForm} className="meals-mobile-save-bar">
            {renderVoteActions()}
          </MobileActionBar>
        </>
      ) : (
        <>
          <MobileVoteSummary
            grouped={grouped}
            votes={votes}
            notEating={notEating}
          />
          {isComplete && !readOnly && (
            <button
              type="button"
              className="btn btn-secondary meal-vote-mobile-change-btn"
              onClick={onStartEdit}
            >
              Change vote
            </button>
          )}
        </>
      )}

      {renderFeedbackSection()}
    </article>
  )
}
