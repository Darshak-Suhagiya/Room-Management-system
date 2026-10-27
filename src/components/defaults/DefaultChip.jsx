import { WandSparkles } from 'lucide-react'
import {
  formatDefaultAppliedLine,
  formatDefaultByLine,
  isDefaultAppliedCurrent,
} from '../../utils/mealDefaultsUtils'
import './defaults.css'

/** Tag shown next to a vote that came from default votes. */
export function DefaultChip({ participation, className = '', compact = false }) {
  if (!participation?.isDefault) return null
  return (
    <span
      className={`default-chip ${compact ? 'is-compact' : ''} ${className}`.trim()}
      title={formatDefaultByLine(participation)}
    >
      <WandSparkles size={compact ? 11 : 12} aria-hidden />
      Default
    </span>
  )
}

/** "Default votes applied by X · 27 Oct" under a slot, while still current. */
export function DefaultAppliedLine({ lock, menu, slot, className = '' }) {
  if (!isDefaultAppliedCurrent(lock, menu, slot)) return null
  return (
    <p className={`default-applied-line ${className}`.trim()}>
      <WandSparkles size={13} aria-hidden />
      <span>{formatDefaultAppliedLine(lock.defaultApplied)}</span>
    </p>
  )
}
