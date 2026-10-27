import { useState } from 'react'
import { CalendarDays, ChevronRight, Save as IconSave, SlidersHorizontal } from 'lucide-react'
import { MobileEmptyState, MobilePageHeader } from '../../mobile'
import { MobileActionBar } from '../../ui/MobileActionBar'
import { AdminCategoryStrip, AdminSearchField } from '../../admin/mobile'
import { MobileEatingSegment } from '../../meals/mobile/MobileEatingSegment'
import { MobileVoteCategorySection } from '../../meals/mobile/MobileVoteCategorySection'
import { DEFAULT_MEAL_MODE } from '../../../config/constants'
import { getVoteValue } from '../../../utils/menuVoteUtils'
import { triggerSelectionHaptic } from '../../../utils/haptics'
import { DefaultOverridesSheet } from './DefaultOverridesSheet'
import '../defaults.css'

export function DefaultVotesMobileView({ ctrl }) {
  const {
    mode,
    setMode,
    votes,
    updateVote,
    dirty,
    saving,
    save,
    reset,
    invalidIds,
    filter,
    changeFilter,
    categoryId,
    setCategoryId,
    categoryChips,
    search,
    setSearch,
    grouped,
    allCount,
    missingCount,
    requiredMissingIds,
    plannedDates,
    overrides,
    upcomingOverrideCount,
    overrideBusy,
    applyOverrides,
    today,
    loadError,
  } = ctrl

  const [sheetOpen, setSheetOpen] = useState(false)
  const eating = mode === DEFAULT_MEAL_MODE.EATING

  const stripItems = [
    { id: 'all', label: 'All', count: allCount },
    ...categoryChips,
  ]

  return (
    <div className="defaults-mobile mobile-section-gap">
      <MobilePageHeader
        artKey="meals"
        size="standard"
        icon={SlidersHorizontal}
        title="Default votes"
        description="Used when you haven’t voted on a meal"
      />

      {loadError ? <p className="form-error">{loadError}</p> : null}

      <section className="defaults-mobile-card" aria-label="Default attendance">
        <h3 className="defaults-mobile-card-title">Default attendance</h3>
        <MobileEatingSegment
          notEating={!eating}
          onChange={(notEating) =>
            setMode(notEating ? DEFAULT_MEAL_MODE.NOT_EATING : DEFAULT_MEAL_MODE.EATING)
          }
          disabled={saving}
        />
        <p className="defaults-mobile-hint muted">
          {eating
            ? 'Counted as eating with your default for each dish.'
            : 'Counted as not eating. Dish defaults apply only on dates you mark Eating.'}
        </p>
        <button
          type="button"
          className="defaults-mobile-overrides-row"
          onClick={() => {
            triggerSelectionHaptic()
            setSheetOpen(true)
          }}
        >
          <CalendarDays size={20} aria-hidden />
          <span className="defaults-mobile-overrides-text">
            <span className="defaults-mobile-overrides-label">Date overrides</span>
            <span className="defaults-mobile-overrides-sub muted">
              {upcomingOverrideCount > 0
                ? `${upcomingOverrideCount} upcoming ${upcomingOverrideCount === 1 ? 'date' : 'dates'} set`
                : 'Pick dates or a range'}
            </span>
          </span>
          <ChevronRight size={18} aria-hidden />
        </button>
      </section>

      {eating && requiredMissingIds.length > 0 && (
        <div className="defaults-needs-notice" role="status">
          <strong>
            {requiredMissingIds.length} planned{' '}
            {requiredMissingIds.length === 1 ? 'dish needs' : 'dishes need'} a default.
          </strong>{' '}
          My Meals voting opens once they are saved.
        </div>
      )}

      <div className="mobile-segmented defaults-mobile-filter" role="group" aria-label="Filter dishes">
        <button
          type="button"
          className={`mobile-segmented-btn${filter === 'all' ? ' is-active' : ''}`}
          aria-pressed={filter === 'all'}
          onClick={() => {
            triggerSelectionHaptic()
            changeFilter('all')
          }}
        >
          All dishes
        </button>
        <button
          type="button"
          className={`mobile-segmented-btn${filter === 'missing' ? ' is-active' : ''}`}
          aria-pressed={filter === 'missing'}
          onClick={() => {
            triggerSelectionHaptic()
            changeFilter('missing')
          }}
        >
          Not set ({missingCount})
        </button>
      </div>

      <AdminSearchField value={search} onChange={setSearch} placeholder="Search dishes" />
      <AdminCategoryStrip items={stripItems} selectedId={categoryId} onSelect={setCategoryId} />

      {grouped.length === 0 ? (
        <MobileEmptyState
          title={filter === 'missing' ? 'All dishes set' : 'No dishes found'}
          hint={
            filter === 'missing'
              ? 'Every dish has a default vote.'
              : 'Try another search or category.'
          }
        />
      ) : (
        grouped.map(({ category, items }, catIndex) => (
          <MobileVoteCategorySection
            key={category.id}
            category={category}
            catIndex={catIndex}
            items={items}
            slot="morning"
            votes={votes}
            missingIds={requiredMissingIds}
            invalidIds={invalidIds}
            onUpdateVote={updateVote}
            disabled={saving}
            getVoteValue={getVoteValue}
          />
        ))
      )}

      <MobileActionBar open={dirty} className="defaults-mobile-save-bar">
        <div className="vote-actions vote-actions-sticky">
          <button
            type="button"
            className="btn btn-primary btn-sm btn-save"
            onClick={save}
            disabled={saving}
          >
            <IconSave size={16} />
            {saving ? 'Saving…' : 'Save defaults'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={reset}
            disabled={saving}
          >
            Reset
          </button>
        </div>
      </MobileActionBar>

      <DefaultOverridesSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        overrides={overrides}
        plannedDates={plannedDates}
        today={today}
        busy={overrideBusy}
        onApply={applyOverrides}
      />
    </div>
  )
}
