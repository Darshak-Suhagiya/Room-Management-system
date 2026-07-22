import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Link2,
  Package,
  Plus,
  Settings2,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { MobilePageHeader } from '../components/mobile'
import { StockQtySlider } from '../components/stock/StockQtySlider'
import {
  STOCK_ITERATION_PERIODS,
  STOCK_UNIT_LABELS,
  STOCK_UNITS,
} from '../config/constants'
import {
  canEditStockGroup,
  canManageStocks,
} from '../config/rolePermissions'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import { listApprovedUsers } from '../services/userService'
import {
  createStockGroup,
  createStockItem,
  deleteStockItem,
  ensureDefaultStockGroups,
  formatStockQty,
  listStockGroups,
  listStockItems,
  setStockQuantity,
  stockSliderBounds,
  updateStockGroup,
  updateStockItem,
} from '../services/stockService'

function formatWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function stockLevelClass(item) {
  const need = Number(item.needPerIteration) || 0
  const qty = Number(item.quantity) || 0
  if (need <= 0) return 'is-ok'
  if (qty < need * 0.5) return 'is-low'
  if (qty < need) return 'is-mid'
  return 'is-ok'
}

function StockLevelBar({ item }) {
  const { max } = stockSliderBounds(item.needPerIteration, item.unit)
  const pct = max > 0 ? Math.min(100, (Number(item.quantity) / max) * 100) : 0
  const needPct =
    max > 0
      ? Math.min(100, ((Number(item.needPerIteration) || 0) / max) * 100)
      : 50
  const level = stockLevelClass(item)

  return (
    <div
      className={`stock-level-bar ${level}`}
      role="img"
      aria-label={`Stock ${formatStockQty(item.quantity, item.unit)} of need ${formatStockQty(item.needPerIteration, item.unit)}`}
    >
      <div className="stock-level-bar-fill" style={{ width: `${pct}%` }} />
      <span
        className="stock-level-bar-need"
        style={{ left: `${needPct}%` }}
        title="Need threshold"
      />
    </div>
  )
}

function StockItemCard({
  item,
  group,
  catalog,
  canEdit,
  onItemUpdated,
  onItemRemoved,
  userId,
}) {
  const toast = useToast()
  const [qtyDraft, setQtyDraft] = useState(item.quantity)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [unit, setUnit] = useState(item.unit)
  const [need, setNeed] = useState(item.needPerIteration)
  const [period, setPeriod] = useState(item.iterationPeriod)
  const [menuItemIds, setMenuItemIds] = useState(item.menuItemIds || [])

  useEffect(() => {
    setQtyDraft(item.quantity)
    setName(item.name)
    setUnit(item.unit)
    setNeed(item.needPerIteration)
    setPeriod(item.iterationPeriod)
    setMenuItemIds(item.menuItemIds || [])
  }, [item])

  const saveQty = async () => {
    if (!canEdit) return
    setBusy(true)
    try {
      const updated = await setStockQuantity(item.id, qtyDraft, { userId })
      toast.success('Stock updated')
      onItemUpdated?.(updated)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const saveMeta = async () => {
    setBusy(true)
    try {
      const updated = await updateStockItem(item.id, {
        name,
        unit,
        needPerIteration: need,
        iterationPeriod: period,
        menuItemIds: group.linkToMenu ? menuItemIds : [],
      })
      toast.success('Item saved')
      setEditing(false)
      onItemUpdated?.(updated)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Delete “${item.name}”?`)) return
    setBusy(true)
    try {
      await deleteStockItem(item.id)
      toast.success('Item deleted')
      onItemRemoved?.(item.id)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const catalogItems = catalog?.items ?? []
  const qtyDirty = Number(qtyDraft) !== Number(item.quantity)
  const level = stockLevelClass(item)
  const linkedCount = (item.menuItemIds || []).length

  return (
    <article className={`stock-item-card rail-card ${level}`}>
      <div className="stock-item-card-head">
        <div>
          <h4 className="stock-item-name">{item.name}</h4>
          <div className="stock-item-badges">
            <span className="stock-pill">{STOCK_UNIT_LABELS[item.unit] || item.unit}</span>
            {level === 'is-low' && (
              <span className="stock-pill stock-pill-warn">Low</span>
            )}
            {level === 'is-mid' && (
              <span className="stock-pill stock-pill-mid">Below need</span>
            )}
            {level === 'is-ok' && Number(item.needPerIteration) > 0 && (
              <span className="stock-pill stock-pill-ok">OK</span>
            )}
            {group.linkToMenu && linkedCount > 0 && (
              <span className="stock-pill stock-pill-link">
                <Link2 size={12} aria-hidden /> {linkedCount} menu
              </span>
            )}
          </div>
        </div>
        <div className="stock-item-qty-display">
          <strong>
            {formatStockQty(canEdit ? qtyDraft : item.quantity, item.unit)}
          </strong>
          <span>{STOCK_UNIT_LABELS[item.unit]}</span>
        </div>
      </div>

      <StockLevelBar item={{ ...item, quantity: canEdit ? qtyDraft : item.quantity }} />

      <StockQtySlider
        value={qtyDraft}
        onChange={setQtyDraft}
        needPerIteration={item.needPerIteration}
        unit={item.unit}
        disabled={!canEdit || busy}
        label="Adjust stock"
      />

      <dl className="stock-item-meta">
        <div>
          <dt>Last filled</dt>
          <dd>{formatWhen(item.lastFilledAt)}</dd>
        </div>
        <div>
          <dt>Last used</dt>
          <dd>{formatWhen(item.lastUsedAt)}</dd>
        </div>
        <div>
          <dt>Need / {item.iterationPeriod}</dt>
          <dd>
            {formatStockQty(item.needPerIteration, item.unit)}{' '}
            {STOCK_UNIT_LABELS[item.unit]}
          </dd>
        </div>
      </dl>

      {canEdit && (
        <div className="stock-item-actions">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy || !qtyDirty}
            onClick={saveQty}
          >
            Save stock
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={busy}
            onClick={() => setEditing((v) => !v)}
          >
            <Settings2 size={14} aria-hidden />
            {editing ? 'Close' : 'Settings'}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={busy}
            onClick={remove}
            aria-label="Delete item"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {editing && canEdit && (
        <div className="stock-item-edit">
          <label className="field-stack">
            <span className="field-stack-label">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="app-input"
            />
          </label>
          <div className="stock-edit-grid">
            <label className="field-stack">
              <span className="field-stack-label">Unit</span>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="app-input"
              >
                {Object.values(STOCK_UNITS).map((u) => (
                  <option key={u} value={u}>
                    {STOCK_UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-stack">
              <span className="field-stack-label">Iteration</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="app-input"
              >
                <option value={STOCK_ITERATION_PERIODS.WEEK}>Week</option>
                <option value={STOCK_ITERATION_PERIODS.MONTH}>Month</option>
              </select>
            </label>
            <label className="field-stack">
              <span className="field-stack-label">Need per {period}</span>
              <input
                type="number"
                min={0}
                step={unit === STOCK_UNITS.KG ? 0.1 : 1}
                value={need}
                onChange={(e) => setNeed(Number(e.target.value) || 0)}
                className="app-input"
              />
            </label>
          </div>
          {group.linkToMenu && (
            <div className="field-stack">
              <span className="field-stack-label">Linked menu items</span>
              <div className="stock-menu-link-list">
                {catalogItems.length === 0 ? (
                  <p className="muted">No menu items in the catalog yet.</p>
                ) : (
                  catalogItems.map((mi) => (
                    <label key={mi.id} className="checkbox-chip">
                      <input
                        type="checkbox"
                        checked={menuItemIds.includes(mi.id)}
                        onChange={() => {
                          setMenuItemIds((prev) =>
                            prev.includes(mi.id)
                              ? prev.filter((x) => x !== mi.id)
                              : [...prev, mi.id],
                          )
                        }}
                      />
                      <span>{mi.gu || mi.en}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={busy}
            onClick={saveMeta}
          >
            Save item settings
          </button>
        </div>
      )}
    </article>
  )
}

export function StocksPage() {
  const { user, profile, canManageStocks: manageStocks } = useAuth()
  const toast = useToast()
  const { catalog } = useMenuCatalog({
    autoSeed: false,
  })
  const [groups, setGroups] = useState([])
  const [items, setItems] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeGroupId, setActiveGroupId] = useState(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupLink, setNewGroupLink] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [newItemUnit, setNewItemUnit] = useState(STOCK_UNITS.KG)
  const [newItemNeed, setNewItemNeed] = useState(5)
  const [showEditors, setShowEditors] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const initialLoadDone = useRef(false)

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent && !initialLoadDone.current) setLoading(true)
    try {
      await ensureDefaultStockGroups(user?.uid)
      const [g, i] = await Promise.all([listStockGroups(), listStockItems()])
      setGroups(g)
      setItems(i)
      setActiveGroupId((prev) => {
        if (prev && g.some((x) => x.id === prev)) return prev
        return g[0]?.id ?? null
      })
      initialLoadDone.current = true
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [toast, user?.uid])

  const patchItem = useCallback((updated) => {
    if (!updated?.id) return
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.id === updated.id)
      if (idx === -1) return [...prev, updated]
      const next = [...prev]
      next[idx] = { ...prev[idx], ...updated }
      return next
    })
  }, [])

  const removeItemLocal = useCallback((itemId) => {
    setItems((prev) => prev.filter((x) => x.id !== itemId))
  }, [])

  const patchGroup = useCallback((updated) => {
    if (!updated?.id) return
    setGroups((prev) =>
      prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)),
    )
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!manageStocks) return
    listApprovedUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [manageStocks])

  const activeGroup = groups.find((g) => g.id === activeGroupId) || null
  const canEdit = canEditStockGroup(profile, activeGroup)
  const groupItems = useMemo(
    () => items.filter((i) => i.groupId === activeGroupId),
    [items, activeGroupId],
  )

  const lowCount = useMemo(
    () => groupItems.filter((i) => stockLevelClass(i) !== 'is-ok').length,
    [groupItems],
  )

  const addGroup = async (e) => {
    e.preventDefault()
    try {
      const g = await createStockGroup(
        { name: newGroupName, linkToMenu: newGroupLink },
        user?.uid,
      )
      setNewGroupName('')
      setShowAddGroup(false)
      toast.success('Group created')
      setGroups((prev) =>
        [...prev, g].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
      )
      setActiveGroupId(g.id)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const addItem = async (e) => {
    e.preventDefault()
    if (!activeGroupId) return
    try {
      const created = await createStockItem(
        {
          groupId: activeGroupId,
          name: newItemName,
          unit: newItemUnit,
          needPerIteration: newItemNeed,
          quantity: 0,
        },
        user?.uid,
      )
      setNewItemName('')
      toast.success('Item added')
      setItems((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      )
    } catch (err) {
      toast.error(err.message)
    }
  }

  const toggleEditor = async (uid) => {
    if (!activeGroup) return
    const next = activeGroup.editorUserIds.includes(uid)
      ? activeGroup.editorUserIds.filter((x) => x !== uid)
      : [...activeGroup.editorUserIds, uid]
    try {
      const updated = await updateStockGroup(activeGroup.id, {
        editorUserIds: next,
      })
      if (updated) patchGroup(updated)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const groupTabs = (
    <div
      className="notices-tabs stock-group-tabs"
      role="tablist"
    >
      {groups.map((g) => {
        const count = items.filter((i) => i.groupId === g.id).length
        return (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === activeGroupId}
            className={`notices-tab${g.id === activeGroupId ? ' is-active' : ''}`}
            onClick={() => setActiveGroupId(g.id)}
          >
            {g.name}
            <span className="stock-tab-count">{count}</span>
          </button>
        )
      })}
    </div>
  )

  const headerActions = manageStocks ? (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => setShowAddGroup((v) => !v)}
    >
      <Plus size={16} aria-hidden /> New group
    </button>
  ) : null

  if (loading) {
    return <p className="page-loading">Loading stocks…</p>
  }

  const stocksBody = (
    <>
      {manageStocks && showAddGroup && (
        <form className="rail-card stock-panel-card" onSubmit={addGroup}>
          <h3 className="rail-card-title">Create stock group</h3>
          <div className="stock-form-row">
            <label className="field-stack stock-form-grow">
              <span className="field-stack-label">Name</span>
              <input
                className="app-input"
                placeholder="e.g. Dairy"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
              />
            </label>
            <label className="checkbox-inline stock-form-check">
              <input
                type="checkbox"
                checked={newGroupLink}
                onChange={(e) => setNewGroupLink(e.target.checked)}
              />
              Related to menu
            </label>
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      )}

      {!activeGroup ? (
        <div className="rail-card stock-empty-card">
          <p className="muted">No stock groups yet.</p>
        </div>
      ) : (
        <div className="stock-group-body">
          <div className="stock-group-summary">
            <div>
              <h3 className="stock-group-title">{activeGroup.name}</h3>
              <p className="muted">
                {groupItems.length} item{groupItems.length === 1 ? '' : 's'}
                {lowCount > 0 ? ` · ${lowCount} below need` : ''}
                {activeGroup.linkToMenu ? ' · Menu-linked' : ''}
              </p>
            </div>
            {manageStocks && (
              <div className="stock-group-toolbar">
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={activeGroup.linkToMenu}
                    onChange={async (e) => {
                      try {
                        const updated = await updateStockGroup(activeGroup.id, {
                          linkToMenu: e.target.checked,
                        })
                        if (updated) patchGroup(updated)
                      } catch (err) {
                        toast.error(err.message)
                      }
                    }}
                  />
                  Related to menu
                </label>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowEditors((v) => !v)}
                >
                  <Users size={14} aria-hidden />
                  Editors
                  {activeGroup.editorUserIds.length > 0
                    ? ` (${activeGroup.editorUserIds.length})`
                    : ''}
                </button>
              </div>
            )}
          </div>

          {manageStocks && showEditors && (
            <section className="rail-card stock-panel-card">
              <h3 className="rail-card-title">Group editors</h3>
              <p className="muted stock-panel-lead">
                People who can edit items in {activeGroup.name} (in addition to
                admin and kitchen lead).
              </p>
              <div className="push-user-picker">
                {users.length === 0 ? (
                  <p className="muted">No users loaded.</p>
                ) : (
                  users.map((u) => (
                    <label key={u.id} className="checkbox-chip">
                      <input
                        type="checkbox"
                        checked={activeGroup.editorUserIds.includes(u.id)}
                        onChange={() => toggleEditor(u.id)}
                      />
                      <span>{u.displayName || u.email}</span>
                    </label>
                  ))
                )}
              </div>
            </section>
          )}

          {canEdit && (
            <form className="rail-card stock-panel-card" onSubmit={addItem}>
              <h3 className="rail-card-title">Add item</h3>
              <div className="stock-form-row">
                <label className="field-stack stock-form-grow">
                  <span className="field-stack-label">Name</span>
                  <input
                    className="app-input"
                    placeholder="e.g. Sugar"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    required
                  />
                </label>
                <label className="field-stack">
                  <span className="field-stack-label">Unit</span>
                  <select
                    className="app-input"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                  >
                    {Object.values(STOCK_UNITS).map((u) => (
                      <option key={u} value={u}>
                        {STOCK_UNIT_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-stack">
                  <span className="field-stack-label">Need / week</span>
                  <input
                    className="app-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={newItemNeed}
                    onChange={(e) =>
                      setNewItemNeed(Number(e.target.value) || 0)
                    }
                  />
                </label>
                <button type="submit" className="btn btn-primary stock-form-submit">
                  <Plus size={16} aria-hidden /> Add
                </button>
              </div>
            </form>
          )}

          {groupItems.length === 0 ? (
            <div className="rail-card stock-empty-card">
              <p className="muted">
                No items in this group yet.
                {canEdit ? ' Use “Add item” above to start.' : ''}
              </p>
            </div>
          ) : (
            <div className="stock-item-grid">
              {groupItems.map((item) => (
                <StockItemCard
                  key={item.id}
                  item={item}
                  group={activeGroup}
                  catalog={catalog}
                  canEdit={canEdit}
                  onItemUpdated={patchItem}
                  onItemRemoved={removeItemLocal}
                  userId={user?.uid}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )

  return (
    <div className="page admin-page stocks-page">
      <div className="layout-desktop">
        <header className="page-header page-header-icon page-header-with-actions">
          <span className="page-header-icon-wrap" aria-hidden>
            <Package size={22} />
          </span>
          <div>
            <h2>Stocks</h2>
            <p>
              Pantry levels by group. The slider midpoint is your need per
              week/month — fill, use, and link items for menu planning.
            </p>
          </div>
          <div className="header-actions">
            <Link to="/shopping" className="btn btn-secondary">
              <ShoppingCart size={16} aria-hidden /> Shopping
            </Link>
            {headerActions}
          </div>
        </header>

        {groupTabs}
        {stocksBody}
      </div>

      <div className="layout-mobile stocks-mobile">
        <MobilePageHeader
          icon={Package}
          title="Stocks"
          description="Pantry levels by group — fill, use, and link items."
        />

        <div className="stocks-mobile-actions">
          <Link to="/shopping" className="btn btn-secondary">
            <ShoppingCart size={16} aria-hidden /> Shopping
          </Link>
          {headerActions}
        </div>

        <div className="stock-group-tabs-mobile">{groupTabs}</div>
        {stocksBody}
      </div>
    </div>
  )
}
