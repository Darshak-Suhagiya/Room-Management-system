import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  formatQuantity,
  isValidQuantity,
  parseQuantityInput,
} from '../../../utils/voteQuantityUtils'
import { triggerSelectionHaptic } from '../../../utils/haptics'

const STEP = 0.5

function toNumber(value) {
  if (value === '' || value === undefined || value === null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function roundStep(n) {
  return Math.round(n * 2) / 2
}

export function MobileQtyStepper({
  value,
  onChange,
  disabled = false,
  hasError = false,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  const num = toNumber(value)
  const display = value === '' || value === undefined || value === null
    ? '0'
    : formatQuantity(num)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commitDraft = () => {
    setEditing(false)
    const parsed = parseQuantityInput(draft)
    if (parsed === '') {
      onChange(0)
      return
    }
    if (isValidQuantity(parsed)) {
      onChange(roundStep(Number(parsed)))
    } else {
      onChange(value === '' ? 0 : value)
    }
  }

  const stepBy = (delta) => {
    if (disabled) return
    triggerSelectionHaptic()
    const next = Math.max(0, roundStep(num + delta))
    onChange(next)
  }

  return (
    <div
      className={`meal-vote-mobile-stepper${hasError ? ' is-error' : ''}`}
      role="group"
      aria-label="Quantity"
    >
      <button
        type="button"
        className="meal-vote-mobile-stepper-btn"
        disabled={disabled || num <= 0}
        aria-label="Decrease quantity"
        onClick={() => stepBy(-STEP)}
      >
        <Minus size={20} />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          enterKeyHint="done"
          placeholder="0"
          className="meal-vote-mobile-stepper-input"
          value={draft}
          disabled={disabled}
          aria-label="Quantity"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitDraft()
            }
            if (e.key === 'Escape') {
              setEditing(false)
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="meal-vote-mobile-stepper-value"
          disabled={disabled}
          aria-label={`Quantity ${display}, tap to type`}
          onClick={() => {
            if (disabled) return
            setDraft(display === '0' && (value === '' || value === undefined) ? '' : display)
            setEditing(true)
          }}
        >
          {display}
        </button>
      )}

      <button
        type="button"
        className="meal-vote-mobile-stepper-btn"
        disabled={disabled}
        aria-label="Increase quantity"
        onClick={() => stepBy(STEP)}
      >
        <Plus size={20} />
      </button>
    </div>
  )
}
