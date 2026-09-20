import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { IssueWizard } from '../IssueWizard'
import { CollectionDetail } from '../CollectionDetail'
import { FinanceStatusPill } from '../FinanceStatusPill'
import { formatDateLabel, formatRupees } from '../../../utils/money'
import {
  issueCollection,
  listDuesForCollection,
} from '../../../services/financeCollectionService'
import { sendCollectionReminder } from '../../../services/financeReminderService'
import { useSaveMutation } from '../../../hooks/useSaveMutation'
import { useToast } from '../../../contexts/ToastContext'

export function CollectionsTab({
  expenses,
  collections,
  duesByCollection,
  paymentsByCollection,
  reportByCollection,
  statementsByUser,
  users,
  settings,
  wallet,
  walletMovements = [],
  memberWallets = [],
  periodId,
  userId,
  actorName,
  canManage,
  onDone,
  focusCollectionId,
  onFocusConsumed,
}) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [pickedId, setPickedId] = useState(null)

  const activeId = pickedId ?? focusCollectionId
  const closeActive = () => {
    setPickedId(null)
    onFocusConsumed?.()
  }
  const active = collections.find((c) => c.id === activeId)
    || Object.values(reportByCollection || {}).find((r) => r.collection?.id === activeId)?.collection
  const report = activeId ? reportByCollection?.[activeId] : null

  const issue = async (payload) => {
    const { ok, result, error, stale } = await run(() =>
      issueCollection({
        ...payload,
        periodId,
        actorId: userId,
        actorName,
        users,
      }),
    )
    if (!ok) {
      if (!stale) throw error
      return
    }
    if (payload.sendReminders && result?.id) {
      const issuedDues = await listDuesForCollection(result.id)
      try {
        await sendCollectionReminder(
          { ...payload, id: result.id, title: payload.title || `Dues ${periodId}`, dueDate: payload.dueDate },
          issuedDues,
          { key: 'issued', payments: [] },
        )
      } catch (err) {
        toast.error(err.message || 'Issued, but reminder failed.')
      }
    }
    toast.success('Collection issued')
    setWizardOpen(false)
    onDone()
  }

  return (
    <div className="finance-stack">
      {canManage ? (
        <div className="finance-section-head">
          <button type="button" className="btn btn-primary" onClick={() => setWizardOpen(true)}>
            Issue collection
          </button>
        </div>
      ) : null}
      <ul className="finance-stack">
        {collections.map((c) => {
          const reportRow = reportByCollection?.[c.id]
          const received = reportRow?.totals.receivedPaise || 0
          return (
            <li key={c.id}>
              <button
                type="button"
                className="rail-card finance-card finance-card-btn"
                onClick={() => setPickedId(c.id)}
              >
                <span className="finance-row-head">
                  <span>
                    <strong>{c.title}</strong>
                    <p className="muted">
                      {formatRupees(c.totalDuePaise)} · due {formatDateLabel(c.dueDate)}
                      {` · received ${formatRupees(received)}`}
                    </p>
                  </span>
                  <FinanceStatusPill status={c.status} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {canManage ? (
        <Modal open={wizardOpen} onClose={() => setWizardOpen(false)} title="Issue collection" wide artKey="finance">
          <IssueWizard
            expenses={expenses}
            users={users}
            settings={settings}
            wallet={wallet}
            memberWallets={memberWallets}
            periodId={periodId}
            busy={busy}
            onIssue={issue}
          />
        </Modal>
      ) : null}

      <Modal open={Boolean(active)} onClose={closeActive} title={active?.title || 'Collection'} extraWide artKey="finance">
        {report ? (
          <CollectionDetail
            report={report}
            dues={duesByCollection[activeId] || []}
            payments={paymentsByCollection[activeId] || []}
            statementsByUser={statementsByUser}
            wallet={wallet}
            walletMovements={walletMovements}
            userId={userId}
            actorName={actorName}
            canManage={canManage}
            onDone={onDone}
            onClosed={closeActive}
          />
        ) : null}
      </Modal>
    </div>
  )
}
