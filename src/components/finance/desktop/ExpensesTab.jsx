import { useState } from 'react'
import { Modal } from '../../ui/Modal'
import { FinanceAmountField } from '../FinanceAmountField'
import { ExpenseAmountFields } from '../CookLeaveCard'
import { ExpenseSplitEditor } from '../ExpenseSplitEditor'
import { defaultIncludedUserIds } from '../../../utils/financePeople'
import { formatRupees, formatRupeesShort } from '../../../utils/money'
import { EXPENSE_STATUS, FINANCE_SPLIT_MODES } from '../../../config/constants'
import { saveExpense, deleteExpense, saveExpenseTemplate } from '../../../services/expenseService'
import { useSaveMutation } from '../../../hooks/useSaveMutation'
import { useToast } from '../../../contexts/ToastContext'
import { FinanceStatusPill } from '../FinanceStatusPill'

export function ExpensesTab({ expenses, templates, users, periodId, userId, onDone }) {
  const toast = useToast()
  const { busy, run } = useSaveMutation()
  const [editing, setEditing] = useState(null)
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
      note: '',
      periodId,
    })
  }

  const save = async () => {
    const { ok, error, stale } = await run(() => saveExpense(editing, userId))
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Expense saved')
    setEditing(null)
    onDone()
  }

  const remove = async (expense) => {
    const { ok, error, stale } = await run(() => deleteExpense(expense.id, expense))
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Expense removed')
    onDone()
  }

  return (
    <div className="finance-expenses finance-stack">
      <section className="rail-card finance-card">
        <h3>Templates</h3>
        <ul className="finance-due-list">
          {templates.map((t) => (
            <li key={t.id}>
              <span>
                {t.name}
                <span className="muted">
                  {' '}
                  · {formatRupeesShort(t.defaultAmountPaise)}
                  {t.active ? '' : ' · inactive'}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="finance-stack finance-template-form">
          <label className="field-stack">
            <span className="field-stack-label">New template</span>
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
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={async () => {
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
              onDone()
            }}
          >
            Add template
          </button>
        </div>
      </section>
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
              Add {t.name}
            </button>
          ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => startNew(null)}>
          Custom expense
        </button>
      </div>
      <ul className="finance-stack">
        {expenses.map((e) => (
          <li key={e.id} className="rail-card finance-card">
            <div className="finance-row-head">
              <div>
                <strong>{e.name}</strong>
                <p className="muted">
                  {formatRupees(e.amountPaise)} · {e.splitMode} · {e.includedUserIds.length} people
                  {e.fromFundPaise > 0 ? ` · ${formatRupees(e.fromFundPaise)} from fund` : ''}
                  {e.cookLeave?.enabled
                    ? ` · ${e.cookLeave.leaveDays ?? 0} leave days`
                    : ''}
                </p>
              </div>
              <div className="finance-table-actions">
                <FinanceStatusPill status={e.status} />
                {e.status !== EXPENSE_STATUS.ISSUED ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditing(e)}
                    >
                      Edit
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(e)}>
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit expense' : 'New expense'}
        wide
        artKey="finance"
      >
        {editing ? (
          <div className="finance-stack">
            <label className="field-stack">
              <span className="field-stack-label">Name</span>
              <input
                className="app-input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </label>
            <ExpenseAmountFields expense={editing} onChange={setEditing} />
            <ExpenseSplitEditor expense={editing} users={users} onChange={setEditing} />
            <div className="finance-wizard-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
