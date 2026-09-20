import { DEPOSIT_MOVEMENT_TYPES } from '../../config/constants'

export const DEPOSIT_ACTION_LABELS = {
  [DEPOSIT_MOVEMENT_TYPES.COLLECT]: 'Collect',
  [DEPOSIT_MOVEMENT_TYPES.REPAY]: 'Repay',
  [DEPOSIT_MOVEMENT_TYPES.TOPUP]: 'Top up',
  [DEPOSIT_MOVEMENT_TYPES.ADJUST]: 'Adjust',
}

export function depositActionTitle(type, personName) {
  const label = DEPOSIT_ACTION_LABELS[type] || 'Deposit'
  return personName ? `${label} · ${personName}` : label
}

export function suggestedDepositAmount(type, person, settings) {
  if (!person) return 0
  const balance = person.deposit?.balancePaise || 0
  const expected = settings?.standardDepositPaise || 0
  if (type === DEPOSIT_MOVEMENT_TYPES.COLLECT || type === DEPOSIT_MOVEMENT_TYPES.TOPUP) {
    return Math.max(0, expected - balance)
  }
  if (type === DEPOSIT_MOVEMENT_TYPES.REPAY) return balance
  return 0
}
