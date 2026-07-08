import { useEffect, useState } from 'react'
import { MEAL_SLOTS } from '../config/menuItems'
import {
  setMealOptOut,
  subscribeMealParticipation,
} from '../services/participationService'

export function MealOptOutToggle({ userId, dateId, slot }) {
  const [notEating, setNotEating] = useState(false)
  const [saving, setSaving] = useState(false)
  const slotInfo = MEAL_SLOTS[slot]

  useEffect(() => {
    if (!userId) return undefined
    return subscribeMealParticipation(userId, dateId, slot, (data) => {
      setNotEating(Boolean(data?.notEating))
    })
  }, [userId, dateId, slot])

  const handleToggle = async () => {
    const next = !notEating
    setSaving(true)
    try {
      await setMealOptOut(userId, dateId, slot, next)
      setNotEating(next)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`opt-out ${notEating ? 'is-opted-out' : ''}`}>
      <button
        type="button"
        className="btn btn-opt-out"
        onClick={handleToggle}
        disabled={saving}
        aria-pressed={notEating}
      >
        {notEating ? 'Not eating ✓' : 'Not eating'}
      </button>
      <span className="opt-out-meta">
        {slotInfo.labelEn} · {notEating ? 'Not eating' : 'Eating'}
      </span>
    </div>
  )
}
