import { Modal } from '../../ui/Modal'
import { DefaultOverrideCalendar } from '../DefaultOverrideCalendar'

/** Bottom sheet wrapper: pick dates or a range, then Eating / Not eating / Use default. */
export function DefaultOverridesSheet({
  open,
  onClose,
  overrides,
  plannedDates,
  today,
  busy,
  onApply,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Date overrides"
      subtitle="Other days use your default"
      artKey="meals"
      busy={busy}
    >
      <div className="defaults-mobile-sheet">
        <DefaultOverrideCalendar
          variant="mobile"
          overrides={overrides}
          plannedDates={plannedDates}
          today={today}
          busy={busy}
          onApply={onApply}
        />
      </div>
    </Modal>
  )
}
