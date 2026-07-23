import { MealCalendar } from '../MealCalendar'
import { Modal } from '../ui/Modal'

/**
 * Full month calendar in a bottom sheet (mobile) / dialog (desktop-sm+).
 */
export function MealCalendarSheet({
  open,
  onClose,
  plannedDates,
  selectedDate,
  today,
  onSelect,
  dateStatus,
  allowAllDates = false,
  viewMonth,
  onViewMonthChange,
  showDotWhenEmpty,
  legend,
}) {
  const handleSelect = (dateId) => {
    onSelect(dateId)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Pick a date" wide>
      <MealCalendar
        allowAllDates={allowAllDates}
        plannedDates={plannedDates}
        selectedDate={selectedDate}
        today={today}
        onSelect={handleSelect}
        dateStatus={dateStatus}
        viewMonth={viewMonth}
        onViewMonthChange={onViewMonthChange}
        showDotWhenEmpty={showDotWhenEmpty}
        legend={legend}
      />
    </Modal>
  )
}
