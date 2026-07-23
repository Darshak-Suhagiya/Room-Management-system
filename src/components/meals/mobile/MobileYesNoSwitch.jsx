import { triggerSelectionHaptic } from '../../../utils/haptics'

/**
 * Compact yes/no switch for dish cards — No ← track → Yes in one slim row.
 */
export function MobileYesNoSwitch({
  value,
  onChange,
  disabled = false,
  hasError = false,
}) {
  const isYes = value === true
  const isNo = value === false
  const unset = !isYes && !isNo

  const select = (next) => {
    if (disabled) return
    triggerSelectionHaptic()
    onChange(next)
  }

  const toggleTrack = () => {
    if (disabled) return
    triggerSelectionHaptic()
    if (unset || isNo) onChange(true)
    else onChange(false)
  }

  return (
    <div
      className={`meal-vote-yesno-switch${hasError ? ' is-error' : ''}${unset ? ' is-unset' : ''}`}
      role="group"
      aria-label="Yes or no"
    >
      <button
        type="button"
        className={`meal-vote-yesno-label is-no${isNo ? ' is-active' : ''}`}
        disabled={disabled}
        aria-pressed={isNo}
        onClick={() => select(false)}
      >
        No
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={isYes}
        aria-label={
          isYes ? 'Yes, tap to switch to No' : isNo ? 'No, tap to switch to Yes' : 'Not selected'
        }
        disabled={disabled}
        className={`meal-vote-yesno-track${isYes ? ' is-yes' : isNo ? ' is-no' : ''}`}
        onClick={toggleTrack}
      >
        <span className="meal-vote-yesno-thumb" aria-hidden />
      </button>

      <button
        type="button"
        className={`meal-vote-yesno-label is-yes${isYes ? ' is-active' : ''}`}
        disabled={disabled}
        aria-pressed={isYes}
        onClick={() => select(true)}
      >
        Yes
      </button>
    </div>
  )
}
