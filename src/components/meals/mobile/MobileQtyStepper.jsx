import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import {
  formatQuantity,
  isValidQuantity,
  parseQuantityInput,
} from '../../../utils/voteQuantityUtils'
import { triggerSelectionHaptic } from '../../../utils/haptics'

const PX_PER_STEP = 12
const AXIS_THRESHOLD = 8
const HUD_EXIT_MS = 180

function toNumber(value) {
  if (value === '' || value === undefined || value === null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function roundToStep(n, step) {
  if (!step || step <= 0) return n
  const scaled = Math.round(n / step) * step
  return Math.round(scaled * 1000) / 1000
}

function normalizeQty(n, stepSize, min) {
  const next = Math.max(min, roundToStep(n, stepSize))
  return stepSize >= 1 ? Math.round(next) : next
}

export function MobileQtyStepper({
  value,
  onChange,
  disabled = false,
  hasError = false,
  step = 0.5,
  min = 0,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [dragging, setDragging] = useState(false)
  const [hudPhase, setHudPhase] = useState('hidden')
  const [hudValue, setHudValue] = useState(0)
  const inputRef = useRef(null)
  const trackRef = useRef(null)
  const suppressClickRef = useRef(false)
  const hudExitTimerRef = useRef(null)
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    axis: null,
    baseValue: 0,
    lastSteps: 0,
    lastValue: 0,
    didDrag: false,
  })

  const stepSize = Number(step) > 0 ? Number(step) : 0.5
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

  useEffect(() => () => {
    if (hudExitTimerRef.current) clearTimeout(hudExitTimerRef.current)
  }, [])

  const applyValue = (next) => {
    const normalized = normalizeQty(next, stepSize, min)
    onChange(normalized)
    return normalized
  }

  const commitDraft = () => {
    setEditing(false)
    const parsed = parseQuantityInput(draft)
    if (parsed === '') {
      onChange(min)
      return
    }
    const n = Number(parsed)
    if (!Number.isFinite(n)) {
      onChange(value === '' ? min : value)
      return
    }
    const rounded = roundToStep(Math.max(min, n), stepSize)
    if (stepSize >= 1) {
      onChange(Math.max(min, Math.round(rounded)))
      return
    }
    if (isValidQuantity(rounded)) {
      onChange(rounded)
    } else {
      onChange(value === '' ? min : value)
    }
  }

  const stepBy = (delta) => {
    if (disabled) return
    triggerSelectionHaptic()
    applyValue(num + delta)
  }

  const showHud = (qty) => {
    if (hudExitTimerRef.current) {
      clearTimeout(hudExitTimerRef.current)
      hudExitTimerRef.current = null
    }
    setHudValue(qty)
    setHudPhase('shown')
  }

  const hideHud = () => {
    setHudPhase('leaving')
    if (hudExitTimerRef.current) clearTimeout(hudExitTimerRef.current)
    hudExitTimerRef.current = setTimeout(() => {
      setHudPhase('hidden')
      hudExitTimerRef.current = null
    }, HUD_EXIT_MS)
  }

  const endDrag = (el) => {
    const d = dragRef.current
    if (!d.active) return
    d.active = false
    if (d.pointerId != null && el?.hasPointerCapture?.(d.pointerId)) {
      try {
        el.releasePointerCapture(d.pointerId)
      } catch {
        /* ignore */
      }
    }
    if (d.didDrag) {
      suppressClickRef.current = true
      hideHud()
    } else {
      setHudPhase('hidden')
    }
    setDragging(false)
    d.pointerId = null
    d.axis = null
    d.didDrag = false
  }

  const onTrackPointerDown = (e) => {
    if (disabled || editing) return
    if (e.button != null && e.button !== 0) return
    const d = dragRef.current
    d.active = true
    d.pointerId = e.pointerId
    d.startX = e.clientX
    d.startY = e.clientY
    d.axis = null
    d.baseValue = num
    d.lastSteps = 0
    d.lastValue = num
    d.didDrag = false
  }

  const onTrackPointerMove = (e) => {
    const d = dragRef.current
    if (!d.active || d.pointerId !== e.pointerId) return

    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY

    if (d.axis == null) {
      if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return
      if (Math.abs(dy) > Math.abs(dx)) {
        d.active = false
        d.axis = 'v'
        return
      }
      d.axis = 'h'
      d.didDrag = true
      setDragging(true)
      showHud(d.lastValue)
      try {
        trackRef.current?.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    if (d.axis !== 'h') return

    e.preventDefault()
    const steps = Math.trunc(dx / PX_PER_STEP)
    if (steps === d.lastSteps) return

    d.lastSteps = steps
    const next = applyValue(d.baseValue + steps * stepSize)
    if (next !== d.lastValue) {
      d.lastValue = next
      triggerSelectionHaptic()
      setHudValue(next)
    }
  }

  const onTrackPointerUp = (e) => {
    const d = dragRef.current
    if (!d.active || (d.pointerId != null && d.pointerId !== e.pointerId)) return
    endDrag(trackRef.current)
  }

  const onValueClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (disabled) return
    setDraft(display === '0' && (value === '' || value === undefined) ? '' : display)
    setEditing(true)
  }

  const hudPrev = normalizeQty(hudValue - stepSize, stepSize, min)
  const hudNext = normalizeQty(hudValue + stepSize, stepSize, min)
  const showHudUi = hudPhase === 'shown' || hudPhase === 'leaving'

  return (
    <div className="meal-vote-mobile-stepper-wrap">
      {showHudUi && (
        <div
          className={`meal-vote-mobile-stepper-hud${hudPhase === 'leaving' ? ' is-leaving' : ''}`}
          aria-live="polite"
        >
          <span key={hudValue} className="meal-vote-mobile-stepper-hud-value">
            {formatQuantity(hudValue)}
          </span>
          <div className="meal-vote-mobile-stepper-hud-ticks" aria-hidden="true">
            <span>{formatQuantity(hudPrev)}</span>
            <span className="is-current">{formatQuantity(hudValue)}</span>
            <span>{formatQuantity(hudNext)}</span>
          </div>
        </div>
      )}

      <div
        className={`meal-vote-mobile-stepper${hasError ? ' is-error' : ''}${dragging ? ' is-dragging' : ''}`}
        role="group"
        aria-label="Quantity"
      >
        <button
          type="button"
          className="meal-vote-mobile-stepper-btn"
          disabled={disabled || num <= min}
          aria-label="Decrease quantity"
          onClick={() => stepBy(-stepSize)}
        >
          <Minus size={20} />
        </button>

        {editing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode={stepSize >= 1 ? 'numeric' : 'decimal'}
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
            ref={trackRef}
            type="button"
            className="meal-vote-mobile-stepper-value"
            disabled={disabled}
            aria-label={`Quantity ${display}, swipe to adjust or tap to type`}
            aria-valuenow={dragging ? hudValue : num}
            aria-valuemin={min}
            onClick={onValueClick}
            onPointerDown={onTrackPointerDown}
            onPointerMove={onTrackPointerMove}
            onPointerUp={onTrackPointerUp}
            onPointerCancel={onTrackPointerUp}
          >
            {display}
          </button>
        )}

        <button
          type="button"
          className="meal-vote-mobile-stepper-btn"
          disabled={disabled}
          aria-label="Increase quantity"
          onClick={() => stepBy(stepSize)}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}
