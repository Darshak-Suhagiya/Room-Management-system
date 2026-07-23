import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { MEAL_SLOTS } from '../../../config/menuItems'
import { formatDisplayDateGu, isTodayDate } from '../../../utils/mealDateUtils'
import { MobilePageHeader } from '../../mobile'
import { MealDayStrip } from '../../meals/MealDayStrip'
import { MealCalendarSheet } from '../../meals/MealCalendarSheet'
import { AdminConfirmSheet, AdminEmptyPanel } from '../../admin/mobile'
import { VotesSlotSegment } from './VotesSlotSegment'
import { VotesSummaryStrip } from './VotesSummaryStrip'
import { VotesSlotCard } from './VotesSlotCard'
import { VotesSlotDetailSheet } from './VotesSlotDetailSheet'

export function VotesMobileView({
  todayId,
  selectedDate,
  onSelectDate,
  plannedDateIds,
  dateStatus,
  plannedDatesSet,
  slotFilter,
  onSlotFilterChange,
  daySlots,
  statsByKey,
  totalMembers,
  canLockVotes,
  canAdjustVoteTotals,
  showVoteCountBreakdown,
  isMaharaj,
  canSeeMaharajMenuDetails,
  busyKey,
  overrideSavingId,
  onToggleLock,
  onRefresh,
  onSaveOverride,
  onOpenItemDetail,
  description,
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [lockConfirm, setLockConfirm] = useState(null)

  const stripIds = useMemo(() => {
    const ids = new Set([todayId, selectedDate, ...plannedDateIds])
    return [...ids].sort((a, b) => a.localeCompare(b))
  }, [todayId, selectedDate, plannedDateIds])

  const openDetail = (entry, stats) => {
    const everyoneNote =
      entry.slot === 'morning'
        ? entry.menu?.morningNote
        : entry.menu?.eveningNote
    const cookNote =
      entry.slot === 'morning'
        ? entry.menu?.morningMaharajNote
        : entry.menu?.eveningMaharajNote
    setDetail({
      entry,
      stats,
      dateLabel: formatDisplayDateGu(entry.date),
      mealLabel: MEAL_SLOTS[entry.slot].labelEn,
      everyoneNote: !isMaharaj ? everyoneNote : '',
      cookNote: canSeeMaharajMenuDetails ? cookNote : '',
      slot: entry.slot,
    })
  }

  // Keep detail sheet stats in sync when parent refreshes statsByKey
  const detailStats =
    detail?.entry?.key && statsByKey[detail.entry.key]
      ? statsByKey[detail.entry.key]
      : detail?.stats

  return (
    <div className="votes-mobile admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        icon={BarChart3}
        title="Vote dashboard"
        description={description}
      />

      <MealDayStrip
        plannedDateIds={stripIds}
        selectedDate={selectedDate}
        today={todayId}
        dateStatus={dateStatus}
        onSelect={onSelectDate}
        onOpenCalendar={() => setCalendarOpen(true)}
      />

      <p className="votes-mobile-date-label muted">
        {formatDisplayDateGu(selectedDate)}
        {isTodayDate(selectedDate) ? ' · Today' : ''}
      </p>

      <VotesSlotSegment value={slotFilter} onChange={onSlotFilterChange} />

      {daySlots.length > 0 && (
        <VotesSummaryStrip
          mealSlots={daySlots}
          statsByKey={statsByKey}
          totalMembers={totalMembers}
        />
      )}

      {daySlots.length === 0 ? (
        <AdminEmptyPanel
          title="No menu planned"
          hint="Pick another date from the strip or calendar."
        />
      ) : (
        <div className="votes-mobile-slot-list">
          {daySlots.map((entry) => (
            <VotesSlotCard
              key={entry.key}
              entry={entry}
              stats={statsByKey[entry.key]}
              canLock={canLockVotes}
              showVoteBreakdown={showVoteCountBreakdown}
              lockBusy={busyKey === `lock-${entry.key}`}
              refreshing={busyKey === `refresh-${entry.key}`}
              showEveryoneNote={!isMaharaj}
              showMaharajNote={canSeeMaharajMenuDetails}
              onRequestLock={(e, locked) => setLockConfirm({ entry: e, locked })}
              onRefresh={onRefresh}
              onOpenDetail={openDetail}
            />
          ))}
        </div>
      )}

      <MealCalendarSheet
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        allowAllDates
        plannedDates={plannedDatesSet}
        selectedDate={selectedDate}
        today={todayId}
        dateStatus={dateStatus}
        onSelect={(id) => {
          onSelectDate(id)
          setCalendarOpen(false)
        }}
      />

      <VotesSlotDetailSheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        stats={detailStats}
        mealLabel={detail?.mealLabel}
        dateLabel={detail?.dateLabel}
        everyoneNote={detail?.everyoneNote}
        cookNote={detail?.cookNote}
        slot={detail?.slot}
        canAdjustTotals={canAdjustVoteTotals}
        showVoteBreakdown={showVoteCountBreakdown}
        showCookItemDetails={canSeeMaharajMenuDetails}
        overrideSavingId={overrideSavingId}
        onSaveOverride={
          canAdjustVoteTotals && detail?.entry
            ? (itemId, total) => onSaveOverride(detail.entry, itemId, total)
            : undefined
        }
        onOpenItemDetail={onOpenItemDetail}
      />

      <AdminConfirmSheet
        open={Boolean(lockConfirm)}
        onClose={() => setLockConfirm(null)}
        title={lockConfirm?.locked ? 'Unlock votes?' : 'Lock votes?'}
        message={
          lockConfirm
            ? lockConfirm.locked
              ? `Allow voting again for ${MEAL_SLOTS[lockConfirm.entry.slot].labelEn}?`
              : `Lock voting for ${MEAL_SLOTS[lockConfirm.entry.slot].labelEn}? Members will not be able to change votes.`
            : ''
        }
        confirmLabel={lockConfirm?.locked ? 'Unlock' : 'Lock'}
        destructive={!lockConfirm?.locked}
        busy={busyKey === `lock-${lockConfirm?.entry?.key}`}
        onConfirm={async () => {
          if (!lockConfirm) return
          await onToggleLock(lockConfirm.entry, lockConfirm.locked)
          setLockConfirm(null)
        }}
      />
    </div>
  )
}
