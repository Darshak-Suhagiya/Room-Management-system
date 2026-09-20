import { IssueWizard } from '../IssueWizard'
import { MobileNestedScreen } from '../../mobile/MobileNestedScreen'
import { MobileActionBar } from '../../ui/MobileActionBar'
import {
  issueCollection,
  listDuesForCollection,
} from '../../../services/financeCollectionService'
import { sendCollectionReminder } from '../../../services/financeReminderService'
import { useSaveMutation } from '../../../hooks/useSaveMutation'
import { useToast } from '../../../contexts/ToastContext'

export function FinanceIssueWizardScreen({
  open,
  onClose,
  expenses,
  users,
  settings,
  wallet,
  memberWallets = [],
  periodId,
  userId,
  actorName,
  onDone,
}) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()

  return (
    <MobileNestedScreen open={open} onClose={onClose} title="Issue collection" artKey="finance">
      <div className="finance-mobile admin-mobile-page-with-bar finance-wizard-mobile mobile-section-gap">
        <IssueWizard
          expenses={expenses}
          users={users}
          settings={settings}
          wallet={wallet}
          memberWallets={memberWallets}
          periodId={periodId}
          busy={busy}
          compact
          onIssue={async (payload) => {
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
              await sendCollectionReminder(
                {
                  ...payload,
                  id: result.id,
                  title: payload.title || `Dues ${periodId}`,
                  dueDate: payload.dueDate,
                },
                issuedDues,
                { key: 'issued' },
              ).catch((err) => toast.error(err.message))
            }
            toast.success('Issued')
            onClose()
            onDone()
          }}
          footer={({ step, setStep, next, submit, busy: b, canSubmit }) => (
            <MobileActionBar open inline>
              <div className="finance-wizard-actions">
                {step > 0 ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setStep(step - 1)}
                  >
                    Back
                  </button>
                ) : null}
                {step < 3 ? (
                  <button type="button" className="btn btn-primary" onClick={next}>
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={b || !canSubmit}
                    onClick={submit}
                  >
                    {b ? 'Issuing…' : 'Issue'}
                  </button>
                )}
              </div>
            </MobileActionBar>
          )}
        />
      </div>
    </MobileNestedScreen>
  )
}
