import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Ban,
  Check,
  Package,
  Plus,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import { MobilePageHeader, MobilePageSkeleton } from '../components/mobile'
import { useDelayedLoading } from '../hooks/useDelayedLoading'
import { useSaveMutation } from '../hooks/useSaveMutation'
import { ShoppingMobileView } from '../components/stock/mobile'
import { StockQtySlider } from '../components/stock/StockQtySlider'
import { ShoppingTicketPreview } from '../components/stock/ShoppingTicketPreview'
import {
  SHOPPING_TICKET_STATUS,
  STOCK_UNIT_LABELS,
  PUSH_AUDIENCE_TYPES,
  PUSH_JOB_KINDS,
} from '../config/constants'
import {
  canEditShoppingTicket,
  canManageStocks,
} from '../config/rolePermissions'
import { listApprovedUsers } from '../services/userService'
import { sendPushNow } from '../services/pushAdminService'
import {
  buildDeficitLines,
  cancelShoppingTicket,
  checkTicketLine,
  createShoppingTicketWithLines,
  listItemsInGroups,
  listShoppingTickets,
  markLineUnavailable,
  uncheckTicketLine,
  unmarkLineUnavailable,
  updateShoppingTicket,
  makeShoppingLineFromItem,
} from '../services/shoppingService'
import {
  ensureDefaultStockGroups,
  formatStockQty,
  listStockGroups,
} from '../services/stockService'

function statusPill(status) {
  if (status === SHOPPING_TICKET_STATUS.DONE) {
    return { label: 'Done', className: 'vote-status-pill is-done' }
  }
  if (status === SHOPPING_TICKET_STATUS.CANCELLED) {
    return { label: 'Cancelled', className: 'stock-pill stock-pill-muted' }
  }
  return { label: 'Open', className: 'stock-pill stock-pill-open' }
}

function ShoppingLineEditor({
  line,
  canEdit,
  open,
  busy,
  onCheck,
  onUncheck,
  onMarkUnavailable,
  onUnmarkUnavailable,
}) {
  const [qty, setQty] = useState(() =>
    Number(formatStockQty(line.qty, line.unit)) || 0,
  )

  useEffect(() => {
    setQty(Number(formatStockQty(line.qty, line.unit)) || 0)
  }, [line.qty, line.itemId, line.unit])

  if (line.checked) {
    return (
      <div className="shopping-line-done-block">
        <p className="shopping-line-done">
          <Check size={14} aria-hidden /> Bought{' '}
          {formatStockQty(line.qty, line.unit)}{' '}
          {STOCK_UNIT_LABELS[line.unit] || line.unit}
        </p>
        {canEdit && open && onUncheck && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={busy}
            onClick={() => onUncheck(line.itemId)}
          >
            Not bought
          </button>
        )}
      </div>
    )
  }

  if (line.unavailable) {
    return (
      <div className="shopping-line-done-block">
        <p className="shopping-line-done muted">
          <Ban size={14} aria-hidden /> Not available in market
        </p>
        {canEdit && open && onUnmarkUnavailable && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={busy}
            onClick={() => onUnmarkUnavailable(line.itemId)}
          >
            Undo
          </button>
        )}
      </div>
    )
  }

  if (!open || !canEdit) {
    return (
      <p className="shopping-line-done">
        {formatStockQty(line.qty, line.unit)}{' '}
        {STOCK_UNIT_LABELS[line.unit] || line.unit}
      </p>
    )
  }

  return (
    <div className="shopping-line-editor">
      <StockQtySlider
        value={qty}
        onChange={setQty}
        needPerIteration={line.needPerIteration}
        unit={line.unit}
        disabled={busy}
        label="Buy amount"
      />
      <div className="shopping-line-actions">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={busy}
          onClick={() => onCheck(line.itemId, qty)}
        >
          <Check size={16} /> Bought — fill stock
        </button>
        {onMarkUnavailable && (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={busy}
            onClick={() => onMarkUnavailable(line.itemId)}
          >
            <Ban size={16} /> Not available
          </button>
        )}
      </div>
    </div>
  )
}

function TicketCard({
  ticket,
  groups,
  users,
  profile,
  userId,
  onTicketUpdated,
  onToggleAssignee,
  onUncheckLine,
  onMarkUnavailable,
  onUnmarkUnavailable,
}) {
  const toast = useToast()
  const checkSave = useSaveMutation()
  const [showAssignees, setShowAssignees] = useState(false)
  const canManage = canManageStocks(profile)
  const canEdit = canEditShoppingTicket(profile, ticket)
  const isTicketOpen = ticket.status === SHOPPING_TICKET_STATUS.OPEN
  const pill = statusPill(ticket.status)
  const busy = checkSave.busy

  const groupNames = ticket.groupIds
    .map((id) => groups.find((g) => g.id === id)?.name || id)
    .join(', ')

  const checkedCount = ticket.lines.filter((l) => l.checked).length
  const unavailableCount = ticket.lines.filter((l) => l.unavailable && !l.checked)
    .length
  const progressPct =
    ticket.lines.length > 0
      ? Math.round((checkedCount / ticket.lines.length) * 100)
      : 0

  const checkLine = async (itemId, qty) => {
    if (!canEdit || ticket.status === SHOPPING_TICKET_STATUS.CANCELLED) return
    const { ok, result, error, stale } = await checkSave.run(() =>
      checkTicketLine(ticket.id, itemId, userId, qty),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Item checked — stock filled')
    onTicketUpdated?.(result)
  }

  const uncheckLine = async (itemId) => {
    if (!canEdit || !onUncheckLine) return
    const { ok, result, error, stale } = await checkSave.run(() =>
      onUncheckLine(ticket, itemId),
    )
    if (!ok) {
      if (!stale) toast.error(error?.message || 'Could not uncheck')
      return
    }
    if (result) onTicketUpdated?.(result)
  }

  const markUnavailable = async (itemId) => {
    if (!canEdit || !onMarkUnavailable) return
    const { ok, result, error, stale } = await checkSave.run(() =>
      onMarkUnavailable(ticket, itemId),
    )
    if (!ok) {
      if (!stale) toast.error(error?.message || 'Could not mark unavailable')
      return
    }
    if (result) onTicketUpdated?.(result)
  }

  const unmarkUnavailable = async (itemId) => {
    if (!canEdit || !onUnmarkUnavailable) return
    const { ok, result, error, stale } = await checkSave.run(() =>
      onUnmarkUnavailable(ticket, itemId),
    )
    if (!ok) {
      if (!stale) toast.error(error?.message || 'Could not undo')
      return
    }
    if (result) onTicketUpdated?.(result)
  }

  const toggleAssignee = async (uid) => {
    if (!canManage || !onToggleAssignee) return
    await onToggleAssignee(ticket.id, uid)
  }

  const assigneeNames = ticket.assigneeIds
    .map((id) => users.find((u) => u.id === id)?.displayName || id)
    .filter(Boolean)

  return (
    <article
      className={`shopping-ticket-card rail-card status-${ticket.status}`}
    >
      <header className="shopping-ticket-head">
        <div className="shopping-ticket-head-main">
          <div className="shopping-ticket-title-row">
            <h3>{groupNames || 'Shopping'}</h3>
            <span className={pill.className}>{pill.label}</span>
          </div>
          <p className="muted">
            {ticket.createdAt
              ? new Date(ticket.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : ''}
            {assigneeNames.length > 0
              ? ` · ${assigneeNames.join(', ')}`
              : ''}
          </p>
          {isTicketOpen && ticket.lines.length > 0 && (
            <div className="shopping-progress">
              <div className="shopping-progress-track">
                <div
                  className="shopping-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="muted">
                {checkedCount}/{ticket.lines.length} bought
                {unavailableCount > 0 ? ` · ${unavailableCount} unavailable` : ''}
              </span>
            </div>
          )}
        </div>
        <div className="shopping-ticket-head-actions">
          {canManage && isTicketOpen && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setShowAssignees((v) => !v)}
            >
              <Users size={14} aria-hidden /> Assign
            </button>
          )}
          {canManage && isTicketOpen && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={busy}
              onClick={async () => {
                try {
                  const updated = await cancelShoppingTicket(ticket.id)
                  onTicketUpdated?.(updated)
                } catch (err) {
                  toast.error(err.message)
                }
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </header>

      {canManage && isTicketOpen && showAssignees && (
        <div className="shopping-assignees">
          <p className="field-stack-label">Shoppers</p>
          <div className="push-user-picker">
            {users.map((u) => (
              <label key={u.id} className="checkbox-chip">
                <input
                  type="checkbox"
                  checked={ticket.assigneeIds.includes(u.id)}
                  onChange={() => toggleAssignee(u.id)}
                />
                <span>{u.displayName || u.email}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <ul className="shopping-lines">
        {ticket.lines.map((line) => (
          <li
            key={line.itemId}
            className={`shopping-line${line.checked ? ' is-checked' : ''}${line.unavailable ? ' is-unavailable' : ''}`}
          >
            <div className="shopping-line-title">
              <strong className={line.unavailable ? 'is-struck' : undefined}>
                {line.name}
              </strong>
              <div className="shopping-meta-chips" aria-label="Line details">
                <span className="shopping-meta-chip">
                  In stock {formatStockQty(line.currentQty, line.unit)}{' '}
                  {STOCK_UNIT_LABELS[line.unit] || line.unit}
                </span>
                <span className="shopping-meta-chip">
                  Need {formatStockQty(line.needPerIteration, line.unit)}
                </span>
                <span className="shopping-meta-chip is-suggest">
                  Suggest {formatStockQty(line.suggestedQty, line.unit)}
                </span>
              </div>
            </div>
            <ShoppingLineEditor
              line={line}
              canEdit={canEdit}
              open={ticket.status !== SHOPPING_TICKET_STATUS.CANCELLED}
              busy={busy}
              onCheck={checkLine}
              onUncheck={uncheckLine}
              onMarkUnavailable={markUnavailable}
              onUnmarkUnavailable={unmarkUnavailable}
            />
          </li>
        ))}
      </ul>
    </article>
  )
}

function ShoppingListTabs({ tab, openCount, closedCount, onTabChange, mobile }) {
  if (mobile) {
    return (
      <div className="shopping-mobile-tabs-sticky">
        <div className="mobile-segmented" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'open'}
            className={`mobile-segmented-btn${tab === 'open' ? ' is-active' : ''}`}
            onClick={() => onTabChange('open')}
          >
            Open ({openCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'closed'}
            className={`mobile-segmented-btn${tab === 'closed' ? ' is-active' : ''}`}
            onClick={() => onTabChange('closed')}
          >
            Closed ({closedCount})
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="notices-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'open'}
        className={`notices-tab${tab === 'open' ? ' is-active' : ''}`}
        onClick={() => onTabChange('open')}
      >
        Open ({openCount})
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === 'closed'}
        className={`notices-tab${tab === 'closed' ? ' is-active' : ''}`}
        onClick={() => onTabChange('closed')}
      >
        Closed ({closedCount})
      </button>
    </div>
  )
}

function ShoppingCreateWizard({
  groups,
  selectedGroups,
  previewLoading,
  onToggleGroup,
  onContinue,
  onCancel,
  mobile,
}) {
  return (
    <div className="shopping-create-wizard">
      <div
        className={`shopping-preview-steps${mobile ? ' shopping-preview-steps-sticky' : ''}`}
        aria-label="Progress"
      >
        <span className="shopping-step is-active">1. Groups</span>
        <span className="shopping-step">2. Review</span>
        <span className="shopping-step">3. Create</span>
      </div>
      <section className="rail-card stock-panel-card">
        <h3 className="rail-card-title">New shopping ticket</h3>
        <p className="muted stock-panel-lead">
          Choose which stock groups to shop for. Next you’ll review items,
          edit amounts, add or remove lines, then create the ticket.
        </p>
        <div className="field-stack">
          <span className="field-stack-label">Groups</span>
          <div className="push-user-picker">
            {groups.map((g) => (
              <label key={g.id} className="checkbox-chip">
                <input
                  type="checkbox"
                  checked={selectedGroups.includes(g.id)}
                  onChange={() => onToggleGroup(g.id)}
                />
                <span>{g.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="stock-form-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={previewLoading || selectedGroups.length === 0}
            onClick={onContinue}
          >
            <ArrowRight size={16} aria-hidden />
            {previewLoading ? 'Loading preview…' : 'Continue to review'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  )
}

export function ShoppingPage() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const { catalog } = useMenuCatalog()
  const [groups, setGroups] = useState([])
  const [tickets, setTickets] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('open')

  const [createStep, setCreateStep] = useState(null)
  const [selectedGroups, setSelectedGroups] = useState([])
  const [previewLines, setPreviewLines] = useState([])
  const [previewItems, setPreviewItems] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const createSave = useSaveMutation()
  const initialLoadDone = useRef(false)

  const manage = canManageStocks(profile)
  const creating = createSave.busy

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent && !initialLoadDone.current) setLoading(true)
    try {
      await ensureDefaultStockGroups(user?.uid)
      const [g, t] = await Promise.all([
        listStockGroups(),
        listShoppingTickets(),
      ])
      setGroups(g)
      setTickets(t)
      initialLoadDone.current = true
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [toast, user?.uid])

  const patchTicket = useCallback((updated) => {
    if (!updated?.id) return
    setTickets((prev) => {
      const idx = prev.findIndex((t) => t.id === updated.id)
      if (idx === -1) return [updated, ...prev]
      const next = [...prev]
      next[idx] = { ...prev[idx], ...updated }
      return next
    })
  }, [])

  const ticketsRef = useRef(tickets)
  ticketsRef.current = tickets

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    listApprovedUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [])

  const openTickets = useMemo(
    () => tickets.filter((t) => t.status === SHOPPING_TICKET_STATUS.OPEN),
    [tickets],
  )
  const closedTickets = useMemo(
    () => tickets.filter((t) => t.status !== SHOPPING_TICKET_STATUS.OPEN),
    [tickets],
  )

  const visibleTickets = tab === 'open' ? openTickets : closedTickets.slice(0, 20)

  const toggleGroup = (id) => {
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const startCreate = () => {
    setSelectedGroups([])
    setPreviewLines([])
    setPreviewItems([])
    setCreateStep('select')
  }

  const cancelCreate = () => {
    setCreateStep(null)
    setSelectedGroups([])
    setPreviewLines([])
    setPreviewItems([])
  }

  const goToPreview = async () => {
    if (selectedGroups.length === 0) {
      toast.error('Select at least one group.')
      return
    }
    setPreviewLoading(true)
    try {
      const [lines, items] = await Promise.all([
        buildDeficitLines(selectedGroups),
        listItemsInGroups(selectedGroups),
      ])
      setPreviewLines(lines)
      setPreviewItems(items)
      setCreateStep('preview')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  const confirmCreate = async (lines) => {
    const { ok, result, error, stale } = await createSave.run(() =>
      createShoppingTicketWithLines(
        { groupIds: selectedGroups, lines, assigneeIds: [] },
        user?.uid,
      ),
    )
    if (!ok) {
      if (!stale) toast.error(error.message)
      return
    }
    toast.success('Shopping ticket created')
    if (stale) return
    cancelCreate()
    setTab('open')
    setTickets((prev) => [result, ...prev.filter((t) => t.id !== result.id)])
  }

  const handleCheckLine = async (ticket, itemId, qty) => {
    if (!ticket) return
    try {
      const updated = await checkTicketLine(ticket.id, itemId, user?.uid, qty)
      toast.success('Item checked — stock filled')
      patchTicket(updated)
      return updated
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleUncheckLine = async (ticket, itemId) => {
    if (!ticket) return null
    try {
      const updated = await uncheckTicketLine(ticket.id, itemId, user?.uid)
      toast.success('Marked not bought — stock reversed')
      patchTicket(updated)
      return updated
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleMarkUnavailable = async (ticket, itemId) => {
    if (!ticket) return null
    try {
      const updated = await markLineUnavailable(ticket.id, itemId, user?.uid)
      toast.success('Marked not available')
      patchTicket(updated)
      return updated
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleUnmarkUnavailable = async (ticket, itemId) => {
    if (!ticket) return null
    try {
      const updated = await unmarkLineUnavailable(ticket.id, itemId)
      toast.success('Back on shopping list')
      patchTicket(updated)
      return updated
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleToggleAssignee = async (ticketId, uid) => {
    const ticket = ticketsRef.current.find((t) => t.id === ticketId)
    if (!ticket) return null
    const had = ticket.assigneeIds.includes(uid)
    const next = had
      ? ticket.assigneeIds.filter((x) => x !== uid)
      : [...ticket.assigneeIds, uid]
    try {
      await updateShoppingTicket(ticket.id, { assigneeIds: next })
      const updated = { ...ticket, assigneeIds: next }
      patchTicket(updated)
      if (!had) {
        try {
          const groupNames = ticket.groupIds
            .map((id) => groups.find((g) => g.id === id)?.name || id)
            .join(', ')
          const pushRes = await sendPushNow({
            title: 'ખરીદી ટિકિટ સોંપાઈ',
            body: `તમને ખરીદી માટે સોંપવામાં આવ્યા છો: ${groupNames || 'ખરીદી યાદી'}.`,
            kind: PUSH_JOB_KINDS.CUSTOM,
            audience: {
              type: PUSH_AUDIENCE_TYPES.USERS,
              userIds: [uid],
            },
            softFailNoTokens: true,
          })
          if (pushRes?.warning || pushRes?.tokenCount === 0) {
            toast.error(
              'Assigned. They need to enable notifications to receive a push.',
            )
          }
        } catch (pushErr) {
          console.error(pushErr)
          toast.error(
            pushErr.message
              ? `Assigned, but push failed: ${pushErr.message}`
              : 'Assigned, but push notification failed.',
          )
        }
      }
      return updated
    } catch (err) {
      toast.error(err.message)
      return null
    }
  }

  const handleAddTicketLine = async (ticket, item) => {
    if (!ticket || !item) return null
    if (ticket.lines.some((l) => l.itemId === item.id)) {
      toast.error('Item already on this ticket.')
      return ticket
    }
    const line = makeShoppingLineFromItem(item)
    const lines = [...ticket.lines, line]
    try {
      await updateShoppingTicket(ticket.id, {
        lines,
        status: SHOPPING_TICKET_STATUS.OPEN,
      })
      const updated = {
        ...ticket,
        lines,
        status: SHOPPING_TICKET_STATUS.OPEN,
      }
      patchTicket(updated)
      toast.success('Item added')
      return updated
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleCancelTicket = async (ticket) => {
    if (!ticket) return
    try {
      const updated = await cancelShoppingTicket(ticket.id)
      patchTicket(updated)
      toast.success('Ticket cancelled')
      return updated
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const newTicketButton = manage && !createStep ? (
    <button type="button" className="btn btn-primary" onClick={startCreate}>
      <Plus size={16} aria-hidden /> New ticket
    </button>
  ) : null

  const previewProps = {
    groups,
    groupIds: selectedGroups,
    initialLines: previewLines,
    availableItems: previewItems,
    catalog,
    onBack: () => setCreateStep('select'),
    onCreate: confirmCreate,
    creating,
  }

  const ticketList = !createStep ? (
    visibleTickets.length === 0 ? (
      <div className="rail-card stock-empty-card">
        <p className="muted">
          {tab === 'open'
            ? 'No open shopping tickets.'
            : 'No closed tickets yet.'}
          {manage && tab === 'open'
            ? ' Create one when groups are below need.'
            : ''}
        </p>
      </div>
    ) : (
      <div className="shopping-ticket-list">
        {visibleTickets.map((t) => (
          <TicketCard
            key={t.id}
            ticket={t}
            groups={groups}
            users={users}
            profile={profile}
            userId={user?.uid}
            onTicketUpdated={patchTicket}
            onToggleAssignee={handleToggleAssignee}
            onUncheckLine={handleUncheckLine}
            onMarkUnavailable={handleMarkUnavailable}
            onUnmarkUnavailable={handleUnmarkUnavailable}
          />
        ))}
      </div>
    )
  ) : null

  const createWizard = (mobile) =>
    manage && createStep === 'select' ? (
      <ShoppingCreateWizard
        groups={groups}
        selectedGroups={selectedGroups}
        previewLoading={previewLoading}
        onToggleGroup={toggleGroup}
        onContinue={goToPreview}
        onCancel={cancelCreate}
        mobile={mobile}
      />
    ) : null

  const showLoadSkeleton = useDelayedLoading(loading)

  if (loading) {
    return showLoadSkeleton ? <MobilePageSkeleton /> : null
  }

  if (createStep === 'preview') {
    return (
      <div className="page admin-page shopping-page">
        <div className="layout-desktop">
          <ShoppingTicketPreview {...previewProps} />
        </div>
        <div className="layout-mobile shopping-mobile admin-mobile-page-with-bar">
          <ShoppingMobileView
            groups={groups}
            users={users}
            userId={user?.uid}
            tab={tab}
            onTabChange={setTab}
            openTickets={openTickets}
            closedTickets={closedTickets}
            visibleTickets={visibleTickets}
            manage={manage}
            createStep="preview"
            selectedGroups={selectedGroups}
            previewLines={previewLines}
            previewItems={previewItems}
            previewLoading={previewLoading}
            creating={creating}
            onStartCreate={startCreate}
            onCancelCreate={cancelCreate}
            onToggleGroup={toggleGroup}
            onContinuePreview={goToPreview}
            onBackPreview={() => setCreateStep('select')}
            onCreateTicket={confirmCreate}
            onCheckLine={handleCheckLine}
            onUncheckLine={handleUncheckLine}
            onMarkUnavailable={handleMarkUnavailable}
            onUnmarkUnavailable={handleUnmarkUnavailable}
            onToggleAssignee={handleToggleAssignee}
            onAddTicketLine={handleAddTicketLine}
            onCancelTicket={handleCancelTicket}
            catalog={catalog}
            availableItems={previewItems}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="page admin-page shopping-page">
      <div className="layout-desktop">
        <header className="page-header page-header-icon page-header-with-actions">
          <span className="page-header-icon-wrap" aria-hidden>
            <ShoppingCart size={22} />
          </span>
          <div>
            <h2>Shopping</h2>
            <p>
              Raise tickets for groups below need, assign shoppers, adjust buy
              amounts, then tick items to fill stock.
            </p>
          </div>
          <div className="header-actions">
            <Link to="/stocks" className="btn btn-secondary">
              <Package size={16} aria-hidden /> Stocks
            </Link>
            {newTicketButton}
          </div>
        </header>

        {!createStep && (
          <ShoppingListTabs
            tab={tab}
            openCount={openTickets.length}
            closedCount={closedTickets.length}
            onTabChange={setTab}
          />
        )}

        {createWizard(false)}
        {ticketList}
      </div>

      <div className="layout-mobile shopping-mobile admin-mobile-page-with-bar">
        <ShoppingMobileView
          groups={groups}
          users={users}
          userId={user?.uid}
          tab={tab}
          onTabChange={setTab}
          openTickets={openTickets}
          closedTickets={closedTickets}
          visibleTickets={visibleTickets}
          manage={manage}
          createStep={createStep}
          selectedGroups={selectedGroups}
          previewLines={previewLines}
          previewItems={previewItems}
          previewLoading={previewLoading}
          creating={creating}
          onStartCreate={startCreate}
          onCancelCreate={cancelCreate}
          onToggleGroup={toggleGroup}
          onContinuePreview={goToPreview}
          onBackPreview={() => setCreateStep('select')}
          onCreateTicket={confirmCreate}
          onCheckLine={handleCheckLine}
          onUncheckLine={handleUncheckLine}
          onMarkUnavailable={handleMarkUnavailable}
          onUnmarkUnavailable={handleUnmarkUnavailable}
          onToggleAssignee={handleToggleAssignee}
          onAddTicketLine={handleAddTicketLine}
          onCancelTicket={handleCancelTicket}
          catalog={catalog}
          availableItems={previewItems}
        />
      </div>
    </div>
  )
}
