import { VOTE_TYPES } from '../../../config/voteTypes'
import { MobileQtyStepper } from './MobileQtyStepper'
import { MobileYesNoSwitch } from './MobileYesNoSwitch'

export function MobileVoteItemCard({
  item,
  value,
  onChange,
  disabled = false,
  missing = false,
  invalid = false,
}) {
  const hasError = missing || invalid
  const isYesNo = item.voteType !== VOTE_TYPES.INTEGER

  return (
    <div
      className={[
        'meal-vote-mobile-item',
        hasError ? 'is-error' : '',
        missing ? 'is-missing' : '',
        invalid ? 'is-invalid' : '',
        isYesNo ? 'is-yesno-row' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="meal-vote-mobile-item-name">{item.gu}</div>
      {isYesNo ? (
        <MobileYesNoSwitch
          value={value}
          onChange={onChange}
          disabled={disabled}
          hasError={hasError}
        />
      ) : (
        <MobileQtyStepper
          value={value}
          onChange={onChange}
          disabled={disabled}
          hasError={hasError}
        />
      )}
      {invalid && (
        <p className="meal-vote-mobile-item-hint">Use steps of 0.5 (e.g. 1, 1.5, 2)</p>
      )}
      {missing && !invalid && (
        <p className="meal-vote-mobile-item-hint">Required</p>
      )}
    </div>
  )
}
