import { VOTE_TYPES } from '../../config/voteTypes'
import { parseQuantityInput } from '../../utils/voteQuantityUtils'

/** Desktop inline vote control: Yes / No buttons or a quantity input. */
export function VoteInput({
  item,
  value,
  onChange,
  disabled,
  hasError,
  slot = 'morning',
}) {
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
