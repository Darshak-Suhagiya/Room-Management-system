import { useEffect, useState } from 'react'
import { formatDateTime, formatRupees, formatSignedRupees } from '../../utils/money'
import { listFundRepairs, runFundRepair } from '../../services/financeFundRepairService'
import { useSaveMutation } from '../../hooks/useSaveMutation'
import { FinanceFacts } from './FinanceFacts'

function lineCopy(line) {
  if (line.kind === 'issueReverse') {
    return `Reversed issue-time rounding for ${line.collectionTitle || 'collection'}`
  }
  if (line.kind === 'applied') {
    return `${line.userName || 'Person'}: rounding added on ${line.collectionTitle || 'collection'}`
  }
  if (line.kind === 'reversed') {
    return `${line.userName || 'Person'}: rounding reversed on ${line.collectionTitle || 'collection'}`
  }
  if (line.kind === 'fromFund') {
    return `Paid expense share from the room fund for ${line.collectionTitle || 'collection'}`
  }
  if (line.kind === 'fromFundPay') {
    return `Restored room-fund payment on ${line.collectionTitle || 'collection'}`
  }
  return line.collectionTitle || line.userName || 'Change'
}

function RepairLines({ lines, compact = false }) {
  if (!lines?.length) return null
  return (
    <ul className={`finance-ledger${compact ? ' is-stacked' : ''}`}>
      {lines.map((line, index) => (
        <li key={`${line.kind}-${line.dueId || line.collectionId || index}`}>
          <span>{lineCopy(line)}</span>
          <span>{formatSignedRupees(line.amountPaise)}</span>
        </li>
      ))}
    </ul>
  )
}

function reportFactRows(report) {
  if (!report) return []
  const rows = [
    { key: 'collections', label: 'Collections', value: String(report.checkedCollections) },
    { key: 'dues', label: 'Dues', value: String(report.checkedDues) },
  ]
  if (report.changeCount) {
    rows.push(
      { key: 'added', label: 'Added', value: formatRupees(report.addedPaise) },
      { key: 'removed', label: 'Removed', value: formatRupees(report.removedPaise) },
      { key: 'net', label: 'Net', value: formatSignedRupees(report.netPaise) },
      { key: 'before', label: 'Fund before', value: formatRupees(report.balanceBeforePaise) },
      { key: 'after', label: 'Fund after', value: formatRupees(report.balanceAfterPaise) },
    )
  } else {
    rows.push({ key: 'result', label: 'Result', value: 'Already matches' })
  }
  return rows
}

function RepairErrors({ errors }) {
  if (!errors?.length) return null
  return (
    <ul className="finance-fix-errors">
      {errors.map((item, index) => (
        <li key={`${item.dueId || item.collectionId || index}`}>
          {item.userName || item.collectionTitle || 'Item'}: {item.message}
        </li>
      ))}
    </ul>
  )
}

function reportCopy(report) {
  if (!report) return ''
  if (!report.changeCount) {
    return `Checked ${report.checkedCollections} collections and ${report.checkedDues} dues. Everything already matches. Nothing to fix.`
  }
  return `Checked ${report.checkedCollections} collections and ${report.checkedDues} dues. Added ${formatRupees(report.addedPaise)}, removed ${formatRupees(report.removedPaise)}, net ${formatSignedRupees(report.netPaise)}. Room fund ${formatRupees(report.balanceBeforePaise)} to ${formatRupees(report.balanceAfterPaise)}.`
}

export function FundFixCard({
  pendingCount = 0,
  userId,
  actorName,
  locked = false,
  block = false,
  compact = false,
  onBusyChange,
  onDone,
}) {
  const { busy, run } = useSaveMutation()
  const [history, setHistory] = useState([])
  const [lastRun, setLastRun] = useState(null)
  const [error, setError] = useState('')
  const disabled = locked || busy

  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])

  const loadHistory = async () => {
    try {
      const rows = await listFundRepairs(10)
      setHistory(rows)
    } catch (err) {
      console.warn('Could not load fund repair history.', err)
    }
  }

  useEffect(() => {
    let cancelled = false
    // Data fetch: state updates happen after awaited Firestore reads.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load recent runs on mount
    void loadHistory().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleFix = async () => {
    if (disabled) return
    setError('')
    const { ok, result, error: nextError, stale } = await run(() =>
      runFundRepair({ actorId: userId, actorName }),
    )
    if (stale) return
    if (!ok) {
      setError(nextError?.message || 'Could not check the room fund.')
      return
    }
    setLastRun(result)
    await onDone?.()
    await loadHistory()
  }

  return (
    <section className="rail-card finance-card finance-stack">
      <h3>Fix fund</h3>
      <p className="muted">
        {compact
          ? 'Adds missing rounding and issue-time expense shares. Delete a collection to undo those shares.'
          : 'Adds missing rounding for people who already paid in full, restores issue-time expense shares, and fixes leftovers. Delete a collection to undo those shares. Extra above a due stays in that person’s wallet.'}
      </p>
      <button
        type="button"
        className={`btn ${pendingCount > 0 ? 'btn-primary' : 'btn-secondary'}${block ? ' btn-block' : ''}`}
        disabled={disabled}
        aria-busy={busy || undefined}
        onClick={handleFix}
      >
        {busy ? <span className="btn-spinner" aria-hidden /> : null}
        {busy ? 'Checking fund…' : 'Fix fund'}
        {!busy && pendingCount > 0 ? (
          <span className="finance-fix-badge">{pendingCount}</span>
        ) : null}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
      {lastRun ? (
        <div className="finance-fix-report">
          {compact ? (
            <FinanceFacts rows={reportFactRows(lastRun)} />
          ) : (
            <p>{reportCopy(lastRun)}</p>
          )}
          <RepairErrors errors={lastRun.errors} />
          <RepairLines lines={lastRun.lines} compact={compact} />
        </div>
      ) : null}
      <div>
        <h4>Recent fixes</h4>
        {history.length === 0 ? (
          <p className="muted">No fund checks yet.</p>
        ) : (
          <ul className={`finance-fix-history${compact ? ' is-compact' : ''}`}>
            {history.map((row) => (
              <li key={row.id}>
                <details>
                  <summary>
                    <span>
                      {formatDateTime(row.finishedAt || row.createdAt)}
                      {row.actorName ? ` · ${row.actorName}` : ''}
                    </span>
                    <span>
                      {row.changeCount
                        ? `${row.changeCount} change${row.changeCount === 1 ? '' : 's'} · ${formatSignedRupees(row.netPaise)}`
                        : 'No changes'}
                    </span>
                  </summary>
                  {compact ? (
                    <FinanceFacts rows={reportFactRows(row)} />
                  ) : (
                    <p>{reportCopy(row)}</p>
                  )}
                  <RepairErrors errors={row.errors} />
                  <RepairLines lines={row.lines} compact={compact} />
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
