import { formatRupees, formatSignedRupees } from '../../utils/money'
import { FinanceFacts } from './FinanceFacts'

export function CloseCollectionSheet({
  open,
  onClose,
  busy = false,
  compact = false,
  preview = null,
  onConfirm,
}) {
  if (!open) return null
  const settleLines = (preview?.settleLines || []).filter((line) => (line.amountPaise || 0) !== 0)
  const leftoverLines = settleLines.filter((line) => (line.amountPaise || 0) > 0)
  const oweRoomLines = settleLines.filter((line) => (line.amountPaise || 0) < 0)
  const coverLines = preview?.coverLines || []
  const recoverLines = preview?.recoverLines || []
  const coverTotal = coverLines.reduce((sum, line) => sum + (line.amountPaise || 0), 0)
  const recoverTotal = recoverLines.reduce((sum, line) => sum + (line.amountPaise || 0), 0)
  const cookLeaveLines = preview?.cookLeaveLines || []
  const cookLeaveTotal = cookLeaveLines.reduce((sum, line) => sum + (line.amountPaise || 0), 0)
  const fromFundLines = preview?.fromFundLines || []
  const fromFundTotal =
    preview?.fromFundPaise ||
    fromFundLines.reduce((sum, line) => sum + (line.amountPaise || 0), 0)
  const fundAfter = preview?.fundBalanceAfterPaise
  const fundGoesNegative = (fundAfter || 0) < 0
  const hasWork =
    settleLines.length > 0 ||
    coverLines.length > 0 ||
    recoverLines.length > 0 ||
    cookLeaveLines.length > 0
  const ledgerClass = `finance-ledger${compact ? ' is-stacked' : ''}`
  const totals = [
    fromFundTotal > 0
      ? { key: 'fromFund', label: 'Already from fund', value: formatRupees(fromFundTotal) }
      : null,
    coverTotal > 0
      ? { key: 'cover', label: 'Cover now (owes room)', value: formatRupees(coverTotal) }
      : null,
    recoverTotal > 0
      ? { key: 'recover', label: 'Recover', value: formatRupees(recoverTotal) }
      : null,
    cookLeaveTotal > 0
      ? { key: 'cookLeave', label: 'Cook leave', value: formatRupees(cookLeaveTotal) }
      : null,
    fundAfter != null
      ? {
          key: 'after',
          label: 'Fund after close',
          value: formatSignedRupees(fundAfter),
          tone: fundGoesNegative ? 'arrears' : undefined,
        }
      : null,
  ].filter(Boolean)

  return (
    <div className="finance-stack">
      <p className="muted">
        Unpaid shares come from the room fund. Those people still owe that amount to the room
        wallet. Leftovers move to wallets. Payments then lock.
      </p>
      {totals.length ? <FinanceFacts rows={totals} /> : null}

      {fromFundLines.length > 0 ? (
        <section className="finance-stack">
          <h4>Already taken at issue</h4>
          <ul className={ledgerClass}>
            {fromFundLines.map((line) => (
              <li key={`from-fund-${line.expenseId}`}>
                <span>{line.name || 'Expense'}</span>
                <span>{formatRupees(line.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {coverLines.length > 0 ? (
        <section className="finance-stack">
          <h4>Room fund will cover — members still owe the room</h4>
          <ul className={ledgerClass}>
            {coverLines.map((line) => (
              <li key={`cover-${line.dueId || line.userId}`}>
                <span>
                  {line.userName || 'Member'}
                  {' · unpaid '}
                  {formatRupees(line.amountPaise)}
                  {' of '}
                  {formatRupees(line.payablePaise)}
                  {' · will owe room'}
                </span>
                <span>{formatRupees(line.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="muted">Nobody still owes a share for the room fund to cover.</p>
      )}

      {recoverLines.length > 0 ? (
        <section className="finance-stack">
          <h4>Recovered to the room fund</h4>
          <ul className={ledgerClass}>
            {recoverLines.map((line) => (
              <li key={`recover-${line.dueId || line.userId}`}>
                <span>{line.userName || 'Member'}</span>
                <span>{formatSignedRupees(line.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {cookLeaveLines.length > 0 ? (
        <section className="finance-stack">
          <h4>Cook leave to the room fund</h4>
          <ul className={ledgerClass}>
            {cookLeaveLines.map((line) => (
              <li key={`cook-leave-${line.expenseId}`}>
                <span>
                  {line.cookName || 'Cook'}
                  {line.name ? ` · ${line.name}` : ''}
                </span>
                <span>{formatSignedRupees(line.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {oweRoomLines.length > 0 ? (
        <section className="finance-stack">
          <h4>Owes the room wallet</h4>
          <ul className={ledgerClass}>
            {oweRoomLines.map((line) => (
              <li key={`owe-${line.dueId || line.userId}`}>
                <span>
                  {line.userName || 'Member'}
                  {' · paid '}
                  {formatRupees(line.paidPaise)}
                  {' of '}
                  {formatRupees(line.payablePaise)}
                </span>
                <span>{formatRupees(-line.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {leftoverLines.length === 0 ? (
        <p className="muted">No leftover will move to a personal wallet.</p>
      ) : (
        <section className="finance-stack">
          <h4>Moved to wallets</h4>
          <ul className={ledgerClass}>
            {leftoverLines.map((line) => (
              <li key={line.dueId || line.userId}>
                <span>
                  {line.userName || 'Member'}
                  {' · paid '}
                  {formatRupees(line.paidPaise)}
                  {' of '}
                  {formatRupees(line.payablePaise)}
                </span>
                <span>{formatSignedRupees(line.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasWork ? <p className="muted">Everyone is settled. Nothing will move.</p> : null}

      {compact ? (
        <div className="finance-sheet-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Closing…' : 'Cover and close'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="finance-wizard-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={onConfirm}>
            {busy ? 'Closing…' : 'Cover and close'}
          </button>
        </div>
      )}
    </div>
  )
}
