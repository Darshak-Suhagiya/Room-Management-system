import { useEffect, useMemo, useState } from 'react'
import { emptyMealSlot } from '../config/menuItems'
import { useToast } from '../contexts/ToastContext'
import { validateMenuPlan } from '../utils/validateMenuPlan'
import { listStockItems } from '../services/stockService'
import {
  useLinkedStockForSlots,
  useStockUsageState,
} from '../components/stock/MenuPlanStockPanel'

function slotsEqual(a, b, categoryIds) {
  for (const id of categoryIds) {
    const left = [...(a?.[id] ?? [])].sort()
    const right = [...(b?.[id] ?? [])].sort()
    if (left.length !== right.length || left.some((value, index) => value !== right[index])) {
      return false
    }
  }
  return true
}

function stockUsageEqual(a, b) {
  const slots = ['morning', 'evening']
  for (const slot of slots) {
    const left = a?.[slot] ?? {}
    const right = b?.[slot] ?? {}
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    for (const key of keys) {
      if ((Number(left[key]) || 0) !== (Number(right[key]) || 0)) return false
    }
  }
  return true
}

export function menuPlanIsDirty(state, initialMenu, categoryIds) {
  const base = initialMenu ?? {}
  if (state.hasMorning !== Boolean(base.hasMorning)) return true
  if (state.hasEvening !== Boolean(base.hasEvening)) return true
  if ((state.morningNote ?? '') !== (base.morningNote ?? '')) return true
  if ((state.eveningNote ?? '') !== (base.eveningNote ?? '')) return true
  if ((state.morningMaharajNote ?? '') !== (base.morningMaharajNote ?? '')) return true
  if ((state.eveningMaharajNote ?? '') !== (base.eveningMaharajNote ?? '')) return true
  if (!slotsEqual(state.morning, base.morning ?? emptyMealSlot(categoryIds), categoryIds)) {
    return true
  }
  if (!slotsEqual(state.evening, base.evening ?? emptyMealSlot(categoryIds), categoryIds)) {
    return true
  }
  if (
    !stockUsageEqual(state.stockUsage, {
      morning: base.stockUsage?.morning ?? {},
      evening: base.stockUsage?.evening ?? {},
    })
  ) {
    return true
  }
  return false
}

export function useMenuPlanForm({
  dateId,
  initialMenu,
  categoryIds,
  onSave,
  onDraftChange,
  onDirtyChange,
}) {
  const toast = useToast()
  const [hasMorning, setHasMorning] = useState(false)
  const [hasEvening, setHasEvening] = useState(false)
  const [morning, setMorning] = useState(() => emptyMealSlot(categoryIds))
  const [evening, setEvening] = useState(() => emptyMealSlot(categoryIds))
  const [morningNote, setMorningNote] = useState('')
  const [eveningNote, setEveningNote] = useState('')
  const [morningMaharajNote, setMorningMaharajNote] = useState('')
  const [eveningMaharajNote, setEveningMaharajNote] = useState('')
  const [stockItems, setStockItems] = useState([])
  const [validationError, setValidationError] = useState('')
  const { stockUsage, setSlotUsage } = useStockUsageState(initialMenu, dateId)

  useEffect(() => {
    let cancelled = false
    listStockItems()
      .then((items) => {
        if (!cancelled) setStockItems(items)
      })
      .catch(() => {
        if (!cancelled) setStockItems([])
      })
    return () => {
      cancelled = true
    }
  }, [dateId])

  const { morningLinked, eveningLinked } = useLinkedStockForSlots({
    hasMorning,
    hasEvening,
    morning,
    evening,
    stockItems,
  })

  useEffect(() => {
    setHasMorning(initialMenu?.hasMorning ?? false)
    setHasEvening(initialMenu?.hasEvening ?? false)
    setMorning(initialMenu?.morning ?? emptyMealSlot(categoryIds))
    setEvening(initialMenu?.evening ?? emptyMealSlot(categoryIds))
    setMorningNote(initialMenu?.morningNote ?? '')
    setEveningNote(initialMenu?.eveningNote ?? '')
    setMorningMaharajNote(initialMenu?.morningMaharajNote ?? '')
    setEveningMaharajNote(initialMenu?.eveningMaharajNote ?? '')
    setValidationError('')
  }, [initialMenu, dateId, categoryIds])

  const planState = useMemo(
    () => ({
      hasMorning,
      hasEvening,
      morning,
      evening,
      morningNote,
      eveningNote,
      morningMaharajNote,
      eveningMaharajNote,
      stockUsage,
    }),
    [
      hasMorning,
      hasEvening,
      morning,
      evening,
      morningNote,
      eveningNote,
      morningMaharajNote,
      eveningMaharajNote,
      stockUsage,
    ],
  )

  useEffect(() => {
    onDraftChange?.({
      hasMorning,
      hasEvening,
      morning: hasMorning ? morning : null,
      evening: hasEvening ? evening : null,
      morningNote,
      eveningNote,
      morningMaharajNote,
      eveningMaharajNote,
    })
  }, [
    hasMorning,
    hasEvening,
    morning,
    evening,
    morningNote,
    eveningNote,
    morningMaharajNote,
    eveningMaharajNote,
    onDraftChange,
  ])

  useEffect(() => {
    onDirtyChange?.(menuPlanIsDirty(planState, initialMenu, categoryIds))
  }, [planState, initialMenu, categoryIds, onDirtyChange])

  const buildPayload = () => ({
    hasMorning,
    hasEvening,
    morning,
    evening,
    morningNote,
    eveningNote,
    morningMaharajNote,
    eveningMaharajNote,
    stockUsage: {
      morning: hasMorning ? stockUsage.morning : {},
      evening: hasEvening ? stockUsage.evening : {},
    },
  })

  const handleSubmit = (e) => {
    e?.preventDefault?.()
    const error = validateMenuPlan({
      hasMorning,
      hasEvening,
      morning,
      evening,
      categoryIds,
    })
    if (error) {
      setValidationError(error)
      toast.error(error)
      return false
    }
    setValidationError('')
    onSave(buildPayload())
    return true
  }

  const toggleItem = (slotKey, categoryId, itemId) => {
    const setter = slotKey === 'morning' ? setMorning : setEvening
    setter((prev) => {
      const current = prev[categoryId] ?? []
      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
      return { ...prev, [categoryId]: next }
    })
  }

  const setSlotEnabled = (slotKey, enabled) => {
    if (slotKey === 'morning') setHasMorning(enabled)
    else setHasEvening(enabled)
  }

  return {
    hasMorning,
    hasEvening,
    morning,
    evening,
    morningNote,
    eveningNote,
    morningMaharajNote,
    eveningMaharajNote,
    stockUsage,
    morningLinked,
    eveningLinked,
    validationError,
    setMorningNote,
    setEveningNote,
    setMorningMaharajNote,
    setEveningMaharajNote,
    setSlotUsage,
    setSlotEnabled,
    toggleItem,
    handleSubmit,
    buildPayload,
  }
}
