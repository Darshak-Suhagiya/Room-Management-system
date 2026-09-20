import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSaveMutation } from '../../hooks/useSaveMutation'
import { useToast } from '../../contexts/ToastContext'
import { resetFinanceLedger } from '../../services/financeResetService'
import { AdminConfirmSheet } from '../admin/mobile/AdminConfirmSheet'

export function FinanceResetCard({
  userId,
  locked = false,
  compact = false,
  onBusyChange,
  onDone,
}) {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const disabled = locked || busy

  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])

  if (!isAdmin) return null

  const handleConfirm = async () => {
    const { ok, result, error, stale } = await run(() =>
      resetFinanceLedger({ actorId: userId }),
    )
    if (stale) return
    if (!ok) {
      toast.error(error?.message || 'Could not reset finance.')
      return
    }
    setConfirmOpen(false)
    toast.success(
      result?.total
        ? `Cleared ${result.total} finance entries. Settings and deposits were kept.`
        : 'Nothing to clear. Settings and deposits were kept.',
    )
    await onDone?.()
  }

  return (
    <>
      <section className="rail-card finance-card finance-stack">
        <h3>Fresh start</h3>
        <p className="muted">
          {compact
            ? 'Deletes collections, dues, payments, expenses, wallets, and the room fund. Keeps settings and deposits.'
            : 'Temporary admin tool. Deletes collections, dues, payments, expenses, room-fund history, member wallets, and repayment requests. Finance settings and deposits stay. The room fund goes back to ₹0.'}
        </p>
        <button
          type="button"
          className={`btn btn-danger${compact ? ' btn-block' : ''}`}
          disabled={disabled}
          aria-busy={busy || undefined}
          onClick={() => setConfirmOpen(true)}
        >
          {busy ? <span className="btn-spinner" aria-hidden /> : null}
          Reset finance
        </button>
      </section>
      <AdminConfirmSheet
        open={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false)
        }}
        artKey="finance"
        title="Reset finance?"
        message="This deletes all collections, dues, payments, expenses, wallets, repayments, and room-fund history. Settings and deposits stay. The room fund goes to ₹0. This cannot be undone."
        confirmLabel="Delete finance entries"
        destructive
        busy={busy}
        onConfirm={handleConfirm}
      />
    </>
  )
}
