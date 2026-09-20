import { useEffect, useState } from 'react'
import { formatRupees, formatSignedRupees } from '../../utils/money'
import {
  previewMemberWalletBackfill,
  runMemberWalletBackfill,
} from '../../services/memberWalletBackfillService'
import { listAllDues, listCollections } from '../../services/financeCollectionService'
import { listAllPayments } from '../../services/financePaymentService'
import { listMemberWallets } from '../../services/memberWalletService'
import { useSaveMutation } from '../../hooks/useSaveMutation'

export function WalletBackfillCard({
  userId,
  actorName,
  locked = false,
  block = false,
  compact = false,
  onBusyChange,
  onDone,
}) {
  const { busy, run } = useSaveMutation()
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const disabled = locked || busy || loading

  useEffect(() => {
    onBusyChange?.(busy || loading)
    return () => onBusyChange?.(false)
  }, [busy, loading, onBusyChange])

  const loadPreview = async () => {
    setError('')
    setLoading(true)
    try {
      const [collections, dues, payments, wallets] = await Promise.all([
        listCollections(),
        listAllDues(),
        listAllPayments(),
        listMemberWallets(),
      ])
      setPreview(previewMemberWalletBackfill({ collections, dues, payments, wallets }))
    } catch (err) {
      setError(err.message || 'Could not preview wallet backfill.')
    } finally {
      setLoading(false)
    }
  }

  const apply = async () => {
    setError('')
    const { ok, result, error: nextError, stale } = await run(() =>
      runMemberWalletBackfill({ actorId: userId, actorName }),
    )
    if (stale) return
    if (!ok) {
      setError(nextError?.message || 'Could not backfill member wallets.')
      return
    }
    setPreview(result)
    await onDone?.()
  }

  return (
    <section className="rail-card finance-card finance-stack">
      <h3>Seed member wallets</h3>
      <p className="muted">
        {compact
          ? 'One-time: move leftovers from closed collections into member wallets.'
          : 'One-time: take leftovers from already-closed collections and write them into member wallets. Open collections are left alone.'}
      </p>
      <div className={block ? 'finance-sheet-actions' : 'finance-wizard-actions'}>
        <button
          type="button"
          className={`btn btn-secondary${block ? ' btn-block' : ''}`}
          disabled={disabled}
          onClick={loadPreview}
        >
          {loading ? 'Previewing…' : 'Preview closed leftovers'}
        </button>
        <button
          type="button"
          className={`btn btn-primary${block ? ' btn-block' : ''}`}
          disabled={disabled || !preview}
          onClick={apply}
        >
          {busy ? 'Seeding…' : 'Apply backfill'}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {preview ? (
        <div className="finance-fix-report">
          <p>
            {preview.changeCount
              ? `${preview.closedCount} closed collections. ${preview.changeCount} wallet moves.`
              : `${preview.closedCount} closed collections. Nothing to seed.`}
          </p>
          {preview.lines?.length ? (
            <ul className={`finance-ledger${compact ? ' is-stacked' : ''}`}>
              {preview.lines.slice(0, 30).map((line) => (
                <li key={`${line.collectionId}-${line.userId}`}>
                  <span>
                    {line.userName || 'Member'} · {line.collectionTitle || 'Collection'}
                  </span>
                  <span>{formatSignedRupees(line.amountPaise)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {preview.lines?.length > 30 ? (
            <p className="muted">Showing the first 30 of {preview.lines.length}.</p>
          ) : null}
          {preview.balances?.some((row) => row.balancePaise) ? (
            <p className="muted">
              Resulting balances include {formatRupees(
                preview.balances.reduce((sum, row) => sum + Math.abs(row.balancePaise || 0), 0),
              )}{' '}
              of absolute wallet amounts.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
