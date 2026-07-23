import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Plus, ShoppingCart } from 'lucide-react'
import { MobilePageHeader } from '../../mobile'
import {
  AdminCategoryStrip,
  AdminConfirmSheet,
  AdminEmptyPanel,
  AdminItemRowCard,
  AdminSearchField,
} from '../../admin/mobile'
import { STOCK_UNIT_LABELS } from '../../../config/constants'
import { formatStockQty } from '../../../services/stockService'
import { useSaveMutation } from '../../../hooks/useSaveMutation'
import { matchStockItemSearch } from '../../../utils/stockSearch'
import { StockItemSheet } from './StockItemSheet'
import { StockGroupSheet } from './StockGroupSheet'
import { StockAddItemSheet } from './StockAddItemSheet'

function stockLevelClass(item) {
  const need = Number(item.needPerIteration) || 0
  const qty = Number(item.quantity) || 0
  if (need <= 0) return 'is-ok'
  if (qty < need * 0.5) return 'is-low'
  if (qty < need) return 'is-mid'
  return 'is-ok'
}

function levelBadge(item) {
  const level = stockLevelClass(item)
  if (level === 'is-low') return { label: 'Low', tone: 'is-warn' }
  if (level === 'is-mid') return { label: 'Below need', tone: 'is-mid' }
  if (Number(item.needPerIteration) > 0) return { label: 'OK', tone: 'is-ok' }
  return null
}

export function StocksMobileView({
  groups,
  items,
  activeGroupId,
  onSelectGroup,
  activeGroup,
  groupItems,
  canEdit,
  manageStocks,
  catalog,
  userId,
  onItemUpdated,
  onDeleteItem,
  onGroupCreated,
  onItemCreated,
}) {
  const [selectedItem, setSelectedItem] = useState(null)
  const [groupSheetOpen, setGroupSheetOpen] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const deleteSave = useSaveMutation()

  const catalogById = useMemo(() => {
    const map = new Map()
    for (const item of catalog?.items || []) map.set(item.id, item)
    return map
  }, [catalog])

  const filteredGroupItems = useMemo(
    () =>
      groupItems.filter((item) =>
        matchStockItemSearch(item, searchQuery, catalogById),
      ),
    [groupItems, searchQuery, catalogById],
  )

  const stripItems = groups.map((g) => ({
    id: g.id,
    label: g.name,
    count: items.filter((i) => i.groupId === g.id).length,
  }))

  const lowCount = filteredGroupItems.filter((i) => stockLevelClass(i) !== 'is-ok').length

  const headerAction = manageStocks ? (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={() => setGroupSheetOpen(true)}
    >
      <Plus size={16} aria-hidden /> Group
    </button>
  ) : (
    <Link to="/shopping" className="btn btn-secondary btn-sm">
      <ShoppingCart size={16} aria-hidden /> Shop
    </Link>
  )

  return (
    <div className="stocks-mobile admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        icon={Package}
        title="Stocks"
        description="Pantry levels by group"
        action={headerAction}
      />

      {manageStocks && activeGroup && canEdit && (
        <div className="admin-mobile-page-actions">
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => setAddItemOpen(true)}
          >
            <Plus size={16} aria-hidden /> Add item
          </button>
        </div>
      )}

      <AdminCategoryStrip
        items={stripItems}
        selectedId={activeGroupId}
        onSelect={onSelectGroup}
      />

      {!activeGroup ? (
        <AdminEmptyPanel title="No stock groups" hint="Create a group to get started." />
      ) : (
        <>
          <div className="admin-mobile-stocks-summary muted">
            {filteredGroupItems.length} item{filteredGroupItems.length === 1 ? '' : 's'}
            {lowCount > 0 ? ` · ${lowCount} below need` : ''}
            {activeGroup.linkToMenu ? ' · Menu-linked' : ''}
          </div>

          <AdminSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search English / Gujarati…"
          />

          <div className="admin-mobile-stocks-list">
            {filteredGroupItems.length === 0 ? (
              <AdminEmptyPanel
                title={
                  searchQuery.trim()
                    ? 'No matching items'
                    : 'No items in this group'
                }
                hint={
                  !searchQuery.trim() && canEdit
                    ? 'Tap Add item to create one.'
                    : undefined
                }
              />
            ) : (
              filteredGroupItems.map((item) => {
                const badge = levelBadge(item)
                return (
                  <AdminItemRowCard
                    key={item.id}
                    title={item.name}
                    subtitle={`${formatStockQty(item.quantity, item.unit)} ${STOCK_UNIT_LABELS[item.unit] || item.unit}`}
                    badge={badge?.label}
                    badgeTone={badge?.tone}
                    onClick={() => setSelectedItem(item)}
                  />
                )
              })
            )}
          </div>
        </>
      )}

      <StockItemSheet
        open={Boolean(selectedItem)}
        item={selectedItem}
        group={activeGroup}
        catalog={catalog}
        canEdit={canEdit}
        userId={userId}
        onClose={() => setSelectedItem(null)}
        onUpdated={(updated) => {
          onItemUpdated?.(updated)
          setSelectedItem((cur) => (cur?.id === updated.id ? updated : cur))
        }}
        onDeleteRequest={(row) => {
          setSelectedItem(null)
          setConfirmDelete(row)
        }}
      />

      <StockGroupSheet
        open={groupSheetOpen}
        userId={userId}
        onClose={() => setGroupSheetOpen(false)}
        onCreated={(group) => {
          onGroupCreated?.(group)
          onSelectGroup(group.id)
          setGroupSheetOpen(false)
        }}
      />

      <StockAddItemSheet
        open={addItemOpen}
        groupId={activeGroupId}
        userId={userId}
        onClose={() => setAddItemOpen(false)}
        onCreated={(created) => {
          onItemCreated?.(created)
          setAddItemOpen(false)
        }}
      />

      <AdminConfirmSheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title="Delete item?"
        message={confirmDelete ? `Remove “${confirmDelete.name}” from stock?` : ''}
        confirmLabel="Delete"
        destructive
        busy={deleteSave.busy}
        onConfirm={async () => {
          if (!confirmDelete) return
          const { ok, stale } = await deleteSave.run(() =>
            onDeleteItem?.(confirmDelete),
          )
          if (!ok || stale) return
          setConfirmDelete(null)
        }}
      />
    </div>
  )
}
