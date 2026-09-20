import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { AdminConfirmSheet, AdminEmptyPanel, AdminItemRowCard } from '../../admin/mobile'
import { FinanceAmountField } from '../FinanceAmountField'
import { ExpenseAmountFields } from '../CookLeaveCard'
import { ExpenseSplitEditor } from '../ExpenseSplitEditor'
import { defaultIncludedUserIds } from '../../../utils/financePeople'
import { formatRupees, formatRupeesShort } from '../../../utils/money'
import { EXPENSE_STATUS, FINANCE_SPLIT_MODES } from '../../../config/constants'
import { saveExpense, deleteExpense, saveExpenseTemplate } from '../../../services/expenseService'
import { useSaveMutation } from '../../../hooks/useSaveMutation'
import { useToast } from '../../../contexts/ToastContext'

export function FinanceExpensesScreen({
  expenses,
  templates,
  users,
  periodId,
  userId,
  onDone,
}) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [tplOpen, setTplOpen] = useState(false)
  const [tplName, setTplName] = useState('')
  const [tplAmount, setTplAmount] = useState(0)

  const startNew = (template) => {
    setEditing({
      templateId: template?.id ?? null,
      name: template?.name || '',
      amountPaise: template?.defaultAmountPaise || 0,
      splitMode: template?.defaultSplitMode || FINANCE_SPLIT_MODES.EQUAL,
      includedUserIds: defaultIncludedUserIds(users),
      shares: {},
      manualPaise: {},
      periodId,
    })
  }

  const saveTemplate = async () => {
    const { ok, error, stale } = await run(() =>
      saveExpenseTemplate(
        {
          name: tplName,
          defaultAmountPaise: tplAmount,
          defaultSplitMode: FINANCE_SPLIT_MODES.EQUAL,
          recurring: true,
          order: templates.length,
          active: true,
        },
        userId,
      ),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Template saved')
    setTplName('')
    setTplAmount(0)
    setTplOpen(false)
    onDone()
  }

  return (
    <div className="finance-mobile finance-mobile-list">
      <div className="finance-chip-row">
        {templates
          .filter((t) => t.active)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => startNew(t)}
            >
              {t.name}
            </button>
          ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => startNew(null)}>
          Custom
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTplOpen(true)}>
          Add template
        </button>
      </div>

      {expenses.length === 0 ? (
        <AdminEmptyPanel
          title="No expenses this period"
          hint="Use a template or add a custom expense."
        />
      ) : (
        expenses.map((e) => (
          <AdminItemRowCard
            key={e.id}
            title={e.name}
            subtitle={`${formatRupeesShort(e.amountPaise)} · ${e.splitMode} · ${e.includedUserIds.length} people${
              e.fromFundPaise > 0 ? ` · ${formatRupeesShort(e.fromFundPaise)} from fund` : ''
            }${
              e.cookLeave?.enabled ? ` · ${e.cookLeave.leaveDays ?? 0} leave days` : ''
            }`}
            badge={e.status}
            badgeTone={e.status === EXPENSE_STATUS.ISSUED ? 'is-ok' : 'is-open'}
            onClick={() => {
              if (e.status === EXPENSE_STATUS.ISSUED) return
              setEditing(e)
            }}
            disabled={e.status === EXPENSE_STATUS.ISSUED}
          />
        ))
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Expense" artKey="finance">
        {editing ? (
          <div className="finance-mobile finance-stack">
            <label className="field-stack">
              <span className="field-stack-label">Name</span>
              <input
                className="app-input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            <ExpenseAmountFields expense={editing} onChange={setEditing} compact />
            <ExpenseSplitEditor
              expense={editing}
              users={users}
              onChange={setEditing}
              compact
            />
            <div className="finance-sheet-actions">
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={busy}
                onClick={async () => {
                  const { ok, error, stale } = await run(() => saveExpense(editing, userId))
                  if (!ok) {
                    if (!stale) toast.error(error.message)
                    return
                  }
                  toast.success('Saved')
                  setEditing(null)
                  onDone()
                }}
              >
                Save
              </button>
              {editing.id && editing.status !== EXPENSE_STATUS.ISSUED ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  onClick={() => setToDelete(editing)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={tplOpen} onClose={() => setTplOpen(false)} title="New template" artKey="finance">
        <div className="finance-stack">
          <label className="field-stack">
            <span className="field-stack-label">Name</span>
            <input
              className="app-input"
              value={tplName}
              onChange={(e) => setTplName(e.target.value)}
              placeholder="Internet"
            />
          </label>
          <FinanceAmountField
            label="Default amount"
            valuePaise={tplAmount}
            onChangePaise={setTplAmount}
          />
          <div className="finance-sheet-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={busy || !tplName.trim()}
              onClick={saveTemplate}
            >
              {busy ? 'Saving…' : 'Save template'}
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setTplOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <AdminConfirmSheet
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        artKey="finance"
        title="Delete expense?"
        message={toDelete ? `${toDelete.name} · ${formatRupees(toDelete.amountPaise)}` : ''}
        confirmLabel="Delete"
        destructive
        busy={busy}
        onConfirm={async () => {
          const { ok, error, stale } = await run(() => deleteExpense(toDelete.id, toDelete))
          if (!ok) {
            if (!stale) toast.error(error.message)
            return
          }
          setToDelete(null)
          setEditing(null)
          onDone()
        }}
      />
    </div>
  )
}
