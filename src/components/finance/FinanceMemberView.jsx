import { useState } from 'react'
import {
  COLLECTION_STATUS,
  MEMBER_WALLET_REASON_LABELS,
  PAYMENT_METHODS,
  WALLET_REPAYMENT_STATUS,
} from '../../config/constants'
import {
  formatDateLabel,
  formatRupees,
  formatRupeesShort,
  formatSignedRupees,
  currentDateId,
} from '../../utils/money'
import { FinanceStatCard } from './FinanceStatCard'
import { FinanceStatusPill } from './FinanceStatusPill'
import { FinanceFacts } from './FinanceFacts'
import { PaymentSheet } from './PaymentSheet'
import { displayName } from '../../utils/financePeople'
import {
  cancelWalletRepayment,
  requestWalletRepayment,
} from '../../services/financeWalletRepaymentService'
import { useSaveMutation } from '../../hooks/useSaveMutation'
import { useToast } from '../../contexts/ToastContext'

export function FinanceMemberView({
  myDues,
  myMovements,
  deposits,
  wallet,
  collections,
  userId,
  actorName,
  statement,
  reportByCollection,
  walletRepayments = [],
  compact = false,
  onOpenCollection,
  onDone,
}) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [repayOpen, setRepayOpen] = useState(false)
  const [amountPaise, setAmountPaise] = useState(0)
  const [method, setMethod] = useState(PAYMENT_METHODS.UPI)
  const [note, setNote] = useState('')
  const [paidOn, setPaidOn] = useState(currentDateId())
  const mine = (myDues || [])
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  const myDeposit = (deposits || []).find((d) => d.userId === userId)
  const collectionById = new Map((collections || []).map((c) => [c.id, c]))
  const openDues = mine.filter((d) => {
    const col = collectionById.get(d.collectionId)
    return col?.status === COLLECTION_STATUS.ISSUED && (d.outstandingPaise || 0) > 0
  })
  const walletArrears = statement?.arrearsPaise || 0
  const pendingRepay = (walletRepayments || []).find(
    (item) => item.status === WALLET_REPAYMENT_STATUS.PENDING && item.userId === userId,
  )

  const openRepay = () => {
    setAmountPaise(walletArrears)
    setMethod(PAYMENT_METHODS.UPI)
    setNote('')
    setPaidOn(currentDateId())
    setRepayOpen(true)
  }

  const saveRepay = async () => {
    const { ok, error, stale } = await run(() =>
      requestWalletRepayment({
        userId,
        userName: statement?.userName || displayName({ id: userId }),
        amountPaise,
        method,
        note,
        paidOn,
        actorId: userId,
        actorName,
      }),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Request sent. A manager will confirm it.')
    setRepayOpen(false)
    onDone?.()
  }

  const cancelRepay = async () => {
    if (!pendingRepay) return
    const { ok, error, stale } = await run(() =>
      cancelWalletRepayment(pendingRepay.id, { actorId: userId }),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Request cancelled')
    onDone?.()
  }

  return (
    <div className="finance-member finance-stack">
      <div className="finance-stat-grid">
        <FinanceStatCard
          label="Room fund"
          amountPaise={wallet?.balancePaise || 0}
          hint="Shared house fund from rounding extras and shortfalls."
        />
        <FinanceStatCard
          label={statement?.balancePaise >= 0 ? 'My credit' : 'My remaining'}
          amountPaise={
            statement
              ? statement.balancePaise >= 0
                ? statement.creditPaise
                : statement.arrearsPaise
              : 0
          }
          hint="Wallet after closed collections. Open collections are separate buckets."
        />
        <FinanceStatCard label="My deposit" amountPaise={myDeposit?.balancePaise || 0} />
      </div>

      <section className="rail-card finance-card">
        <h3>To pay</h3>
        {openDues.length === 0 && walletArrears <= 0 ? (
          <p className="muted">Nothing outstanding right now.</p>
        ) : (
          <ul className="finance-due-cards">
            {walletArrears > 0 ? (
              <li className="finance-due-card">
                <div className="finance-due-card-head">
                  <strong>Wallet remaining</strong>
                </div>
                <FinanceFacts
                  rows={[
                    { key: 'remaining', label: 'To repay', value: formatRupees(walletArrears) },
                    pendingRepay
                      ? {
                          key: 'requested',
                          label: 'Requested',
                          value: formatRupees(pendingRepay.amountPaise),
                        }
                      : null,
                  ].filter(Boolean)}
                />
                {pendingRepay ? (
                  <>
                    <p className="muted">Waiting for a manager to confirm.</p>
                    <button
                      type="button"
                      className={`btn btn-ghost${compact ? ' btn-block' : ' btn-sm'}`}
                      disabled={busy}
                      onClick={cancelRepay}
                    >
                      Cancel request
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={`btn btn-primary${compact ? ' btn-block' : ' btn-sm'}`}
                    onClick={openRepay}
                  >
                    I paid this
                  </button>
                )}
              </li>
            ) : null}
            {openDues.map((due) => {
              const col = collectionById.get(due.collectionId)
              const report = reportByCollection?.[due.collectionId]
              const row = report?.people?.find((p) => p.userId === userId)
              const cookLeaveToFund = report?.totals?.cookLeaveToFundPaise || 0
              const cookLeaveCut = report?.totals?.cookLeaveBillReductionPaise || 0
              const fromFundPaise = report?.totals?.fromFundPaise || 0
              const facts = [
                { key: 'share', label: 'This share', value: formatRupees(due.roundedDuePaise) },
                col?.dueDate
                  ? { key: 'due', label: 'Due', value: formatDateLabel(col.dueDate) }
                  : null,
                row?.creditPaise > 0
                  ? {
                      key: 'wallet',
                      label: 'Wallet applied',
                      value: formatRupees(row.creditPaise),
                      tone: 'credit',
                    }
                  : null,
                row?.arrearsPaise > 0
                  ? {
                      key: 'arrears',
                      label: 'Wallet remaining',
                      value: formatRupees(row.arrearsPaise),
                      tone: 'arrears',
                    }
                  : null,
                {
                  key: 'toPay',
                  label: 'To pay',
                  value: formatRupees(row?.toPayPaise ?? due.outstandingPaise ?? 0),
                },
                fromFundPaise > 0
                  ? { key: 'fromFund', label: 'From fund', value: formatRupees(fromFundPaise) }
                  : null,
                cookLeaveToFund > 0
                  ? { key: 'cookLeave', label: 'Cook leave', value: formatRupees(cookLeaveToFund) }
                  : cookLeaveCut > 0
                    ? { key: 'leaveCut', label: 'Leave cut', value: formatRupees(cookLeaveCut) }
                    : null,
                row?.leftoverCreditPaise > 0
                  ? {
                      key: 'extra',
                      label: 'Extra here',
                      value: formatRupees(row.leftoverCreditPaise),
                      tone: 'credit',
                    }
                  : null,
              ].filter(Boolean)
              return (
                <li key={due.id} className="finance-due-card">
                  <div className="finance-due-card-head">
                    <strong>{col?.title || 'Collection'}</strong>
                    <FinanceStatusPill status={due.status} />
                  </div>
                  <FinanceFacts rows={facts} />
                  {onOpenCollection ? (
                    <button
                      type="button"
                      className={`btn btn-primary${compact ? ' btn-block' : ' btn-sm'}`}
                      onClick={() => onOpenCollection(due.collectionId)}
                    >
                      Open collection
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rail-card finance-card">
        <h3>My wallet history</h3>
        {statement?.lines?.length ? (
          <ul className={`finance-ledger${compact ? ' is-stacked' : ''}`}>
            {statement.lines.map((line) => (
              <li key={line.id}>
                <span>
                  {MEMBER_WALLET_REASON_LABELS[line.reason || line.type] || line.type}
                  {line.collectionTitle ? ` · ${line.collectionTitle}` : ''}
                  {line.note ? ` · ${line.note}` : ''}
                </span>
                <span>{formatSignedRupees(line.amountPaise)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No collection wallet activity yet.</p>
        )}
      </section>

      <section className="rail-card finance-card">
        <h3>My deposit</h3>
        {myMovements?.length ? (
          <ul className={`finance-ledger${compact ? ' is-stacked' : ''}`}>
            {myMovements.slice(0, 8).map((m) => (
              <li key={m.id}>
                <span>{m.type}</span>
                <span>{formatRupeesShort(m.amountPaise)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No deposit movements yet.</p>
        )}
      </section>

      <PaymentSheet
        open={repayOpen}
        onClose={() => setRepayOpen(false)}
        busy={busy}
        compact={compact}
        title="I paid my wallet remaining"
        remainingPaise={walletArrears}
        amountPaise={amountPaise}
        onChangePaise={setAmountPaise}
        method={method}
        onMethodChange={setMethod}
        note={note}
        onNoteChange={setNote}
        paidOn={paidOn}
        onPaidOnChange={setPaidOn}
        hint={`This asks a manager to move ${formatRupees(amountPaise || walletArrears)} from your remaining wallet into the room fund.`}
        confirmLabel="Send request"
        onConfirm={saveRepay}
      />
    </div>
  )
}
