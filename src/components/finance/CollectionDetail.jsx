import { useState } from 'react'
import { COLLECTION_STATUS, PAYMENT_METHODS } from '../../config/constants'
import { currentDateId, formatDateLabel, formatRupees } from '../../utils/money'
import {
  closeCollection,
  deleteCollection,
  previewCollectionClose,
  previewCollectionDelete,
} from '../../services/financeCollectionService'
import { payDueFromRoomFund, recordPayment, voidPayment } from '../../services/financePaymentService'
import { unwaiveDue, waiveDue } from '../../services/financeDuesService'
import { sendCollectionReminder } from '../../services/financeReminderService'
import { exportMemberReport, exportRoomReport } from '../../utils/financePdf'
import { useSaveMutation } from '../../hooks/useSaveMutation'
import { useToast } from '../../contexts/ToastContext'
import { AdminConfirmSheet } from '../admin/mobile/AdminConfirmSheet'
import { MobileActionBar } from '../ui/MobileActionBar'
import { Modal } from '../ui/Modal'
import { CollectionReport } from './CollectionReport'
import { PaymentSheet } from './PaymentSheet'
import { CloseCollectionSheet } from './CloseCollectionSheet'
import { DeleteCollectionSheet } from './DeleteCollectionSheet'
import { FinanceStatusPill } from './FinanceStatusPill'

export function CollectionDetail({
  report,
  dues = [],
  payments = [],
  statementsByUser,
  wallet,
  walletMovements = [],
  userId,
  actorName,
  canManage = false,
  compact = false,
  onDone,
  onClosed,
}) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [payRow, setPayRow] = useState(null)
  const [payMode, setPayMode] = useState('member')
  const [amountPaise, setAmountPaise] = useState(0)
  const [method, setMethod] = useState(PAYMENT_METHODS.UPI)
  const [note, setNote] = useState('')
  const [paidOn, setPaidOn] = useState(currentDateId())
  const [exporting, setExporting] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [closePreview, setClosePreview] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePreview, setDeletePreview] = useState(null)
  const [unwaiveRow, setUnwaiveRow] = useState(null)

  if (!report?.collection) return null
  const collection = report.collection
  const closed = collection.status === COLLECTION_STATUS.CLOSED
  const issued = collection.status === COLLECTION_STATUS.ISSUED
  const outstanding = report.totals?.outstandingPaise || 0

  const openPay = (row) => {
    if (closed) return
    setPayMode('member')
    setPayRow(row)
    setAmountPaise(row.toPayPaise > 0 ? row.toPayPaise : row.outstandingPaise || 0)
    setMethod(PAYMENT_METHODS.UPI)
    setNote('')
    setPaidOn(currentDateId())
  }

  const openPayFromFund = (row) => {
    if (closed) return
    setPayMode('fund')
    setPayRow(row)
    setAmountPaise(row.fundCoverPaise || 0)
    setMethod(PAYMENT_METHODS.OTHER)
    setNote('')
    setPaidOn(currentDateId())
  }

  const savePay = async () => {
    const { ok, error, stale } = await run(() =>
      payMode === 'fund'
        ? payDueFromRoomFund({
            dueId: payRow.id,
            amountPaise,
            note,
            paidOn,
            actorId: userId,
            actorName,
          })
        : recordPayment({
            dueId: payRow.id,
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
    toast.success('Payment saved')
    setPayRow(null)
    onDone?.()
  }

  const handleExportRoom = async () => {
    setExporting(true)
    try {
      await exportRoomReport(report, { wallet, walletMovements })
    } catch (err) {
      toast.error(err.message || 'Could not export PDF.')
    } finally {
      setExporting(false)
    }
  }

  const handleExportMember = async (memberId) => {
    const id = memberId || userId
    if (!id) {
      toast.error('No person selected for the personal report.')
      return
    }
    setExporting(true)
    try {
      await exportMemberReport(report, id)
    } catch (err) {
      toast.error(err.message || 'Could not export PDF.')
    } finally {
      setExporting(false)
    }
  }

  const openCloseSheet = async () => {
    try {
      const preview = await previewCollectionClose(collection.id)
      setClosePreview(preview)
      setCloseOpen(true)
    } catch (err) {
      toast.error(err.message || 'Could not prepare close.')
    }
  }

  const openDeleteSheet = async () => {
    try {
      const preview = await previewCollectionDelete(collection.id)
      setDeletePreview(preview)
      setDeleteOpen(true)
    } catch (err) {
      toast.error(err.message || 'Could not prepare delete.')
    }
  }

  const sendReminder = async () => {
    try {
      await sendCollectionReminder(collection, dues, {
        key: `manual-${Date.now()}`,
        payments,
        statementsByUser,
      })
      toast.success('Reminder sent')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const restoreDue = async () => {
    if (!unwaiveRow) return
    const { ok, error, stale } = await run(() =>
      unwaiveDue(unwaiveRow.id, { actorId: userId, actorName }),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Due restored')
    setUnwaiveRow(null)
    onDone?.()
  }

  const pdfRoomButton = (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={exporting}
      onClick={handleExportRoom}
    >
      {exporting ? 'Preparing…' : 'Download room PDF'}
    </button>
  )
  const pdfMineButton = (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={exporting}
      onClick={() => handleExportMember(userId)}
    >
      Download my PDF
    </button>
  )
  const remindButton = canManage && issued ? (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={busy}
      onClick={sendReminder}
    >
      Send reminder
    </button>
  ) : null
  const closeButton = canManage && issued ? (
    <button type="button" className="btn btn-ghost" disabled={busy} onClick={openCloseSheet}>
      Close collection
    </button>
  ) : null
  const deleteButton = canManage && !closed ? (
    <button type="button" className="btn btn-danger" disabled={busy} onClick={openDeleteSheet}>
      Delete collection
    </button>
  ) : null

  return (
    <div className={`finance-stack${compact ? ' finance-detail-compact finance-mobile' : ''}`}>
      <div className="finance-report-head">
        <FinanceStatusPill status={collection.status} />
        <p className="muted">
          Due {formatDateLabel(collection.dueDate)} · {formatRupees(outstanding)} outstanding
        </p>
      </div>

      {!compact ? (
        <div className="finance-section-head">
          {pdfRoomButton}
          {pdfMineButton}
          {remindButton}
          {closeButton}
          {deleteButton}
        </div>
      ) : null}

      <CollectionReport
        report={report}
        userId={userId}
        canManage={canManage}
        frozen={closed}
        compact={compact}
        onRecordPayment={openPay}
        onPayFromFund={openPayFromFund}
        onVoidPayment={async (payment) => {
          const { ok, error, stale } = await run(() =>
            voidPayment(payment.id, { actorId: userId, applyFund: canManage }),
          )
          if (!ok) {
            if (!stale) toast.error(error.message)
            return
          }
          toast.success('Payment voided')
          onDone?.()
        }}
        onWaive={async (row) => {
          const { ok, error, stale } = await run(() =>
            waiveDue(row.id, { actorId: userId, actorName }),
          )
          if (!ok) {
            if (!stale) toast.error(error.message)
            return
          }
          toast.success('Due waived')
          onDone?.()
        }}
        onUnwaive={setUnwaiveRow}
      />

      {compact ? (
        <MobileActionBar open className="finance-detail-action-bar" inline>
          {pdfRoomButton}
          {pdfMineButton}
          {remindButton}
          {closeButton}
          {deleteButton}
        </MobileActionBar>
      ) : null}

      <PaymentSheet
        key={`${payMode}-${payRow?.id || 'pay'}`}
        open={Boolean(payRow)}
        onClose={() => setPayRow(null)}
        busy={busy}
        compact={compact}
        title={payMode === 'fund' ? 'Pay from room fund' : 'Record payment'}
        personName={payRow?.userName}
        remainingPaise={payMode === 'fund' ? payRow?.fundCoverPaise || 0 : payRow?.toPayPaise || 0}
        amountPaise={amountPaise}
        onChangePaise={setAmountPaise}
        method={method}
        onMethodChange={setMethod}
        note={note}
        onNoteChange={setNote}
        paidOn={paidOn}
        onPaidOnChange={setPaidOn}
        hideMethod={payMode === 'fund'}
        hint={
          payMode === 'fund'
            ? `The room fund will pay ${formatRupees(payRow?.fundCoverPaise || 0)} of this share. That amount stays as remaining on their wallet until they repay it.`
            : undefined
        }
        confirmLabel={payMode === 'fund' ? 'Pay from room fund' : 'Save payment'}
        onConfirm={savePay}
      />

      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Close collection" busy={busy} artKey="finance">
        <CloseCollectionSheet
          open={closeOpen}
          onClose={() => setCloseOpen(false)}
          busy={busy}
          compact={compact}
          preview={closePreview}
          onConfirm={async () => {
            const { ok, error, stale } = await run(() =>
              closeCollection(collection.id, { actorId: userId, actorName }),
            )
            if (!ok) {
              if (!stale) toast.error(error.message)
              return
            }
            toast.success('Collection closed')
            setCloseOpen(false)
            onClosed?.()
            onDone?.()
          }}
        />
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete collection" busy={busy} artKey="finance">
        <DeleteCollectionSheet
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          busy={busy}
          compact={compact}
          preview={deletePreview}
          onConfirm={async () => {
            const { ok, error, stale } = await run(() => deleteCollection(collection.id))
            if (!ok) {
              if (!stale) toast.error(error.message)
              return
            }
            toast.success('Collection deleted')
            setDeleteOpen(false)
            onClosed?.()
            onDone?.()
          }}
        />
      </Modal>

      <AdminConfirmSheet
        open={Boolean(unwaiveRow)}
        onClose={() => setUnwaiveRow(null)}
        artKey="finance"
        title="Restore share?"
        message={`Restore ${unwaiveRow?.userName || 'this person'}'s share? They will owe the remaining amount again.`}
        confirmLabel="Restore"
        busy={busy}
        onConfirm={restoreDue}
      />
    </div>
  )
}
