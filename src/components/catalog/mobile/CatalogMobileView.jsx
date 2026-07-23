import { useMemo, useState } from 'react'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { MobilePageHeader } from '../../mobile'
import {
  AdminCategoryStrip,
  AdminConfirmSheet,
  AdminEmptyPanel,
  AdminSearchField,
} from '../../admin/mobile'
import { useSaveMutation } from '../../../hooks/useSaveMutation'
import { CatalogItemRowCard } from './CatalogItemRowCard'
import { CatalogItemSheet } from './CatalogItemSheet'
import { CatalogCategorySheet } from './CatalogCategorySheet'
import { CatalogAddItemSheet } from './CatalogAddItemSheet'
import { PlanningGroupsSheet } from './PlanningGroupsSheet'

export function CatalogMobileView({
  catalog,
  seedBanner,
  seeding,
  error,
  onSaveItem,
  onDeleteItem,
  onAddCategory,
  onDeleteCategory,
  onAddItem,
  onGroupsSaved,
  onError,
}) {
  const [activeCategoryId, setActiveCategoryId] = useState(
    () => catalog.categories[0]?.id ?? null,
  )
  const [search, setSearch] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [categorySheet, setCategorySheet] = useState(null)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const itemSave = useSaveMutation()
  const categorySave = useSaveMutation()
  const addItemSave = useSaveMutation()
  const deleteSave = useSaveMutation()

  const stripItems = catalog.categories.map((cat) => ({
    id: cat.id,
    label: cat.labelGu || cat.labelEn,
    count: (catalog.itemsByCategory[cat.id] ?? []).length,
  }))

  const activeCategory = catalog.categories.find((c) => c.id === activeCategoryId) ?? null
  const categoryItems = catalog.itemsByCategory[activeCategoryId] ?? []

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    const results = []
    for (const cat of catalog.categories) {
      for (const item of catalog.itemsByCategory[cat.id] ?? []) {
        const hay = `${item.gu} ${item.en}`.toLowerCase()
        if (hay.includes(q)) {
          results.push({ item, category: cat })
        }
      }
    }
    return results
  }, [catalog, search])

  const headerAction = (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={() => setCategorySheet({ isNew: true })}
    >
      <Plus size={16} aria-hidden /> Category
    </button>
  )

  const handleSaveItem = async (data) => {
    if (!selectedItem) return
    const itemId = selectedItem.id
    const { ok, error, stale } = await itemSave.run(() =>
      onSaveItem?.(itemId, data),
    )
    if (!ok) {
      if (!stale) onError?.(error)
      return
    }
    if (stale) return
    setSelectedItem(null)
  }

  return (
    <div className="admin-catalog-mobile admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        icon={UtensilsCrossed}
        title="Menu editing"
        description="Dishes, vote types, and Maharaj-only notes"
        action={headerAction}
      />

      {seeding && <p className="muted">Importing default menu list…</p>}
      {error && <p className="form-error">{error}</p>}
      {seedBanner}

      <AdminSearchField value={search} onChange={setSearch} placeholder="Search dishes…" />

      {!searchResults && (
        <AdminCategoryStrip
          items={stripItems}
          selectedId={activeCategoryId}
          onSelect={setActiveCategoryId}
        />
      )}

      {activeCategory && !searchResults && (
        <div className="admin-mobile-catalog-toolbar">
          <p className="muted">
            {categoryItems.length} item{categoryItems.length === 1 ? '' : 's'}
          </p>
          <div className="admin-mobile-catalog-toolbar-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setGroupsOpen(true)}
            >
              Groups
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAddItemOpen(true)}
            >
              <Plus size={16} aria-hidden /> Add dish
            </button>
          </div>
        </div>
      )}

      {searchResults ? (
        searchResults.length === 0 ? (
          <AdminEmptyPanel title="No matches" hint="Try another search term." />
        ) : (
          <div className="admin-mobile-catalog-list">
            {searchResults.map(({ item }) => (
              <CatalogItemRowCard
                key={item.id}
                item={item}
                dirty={false}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )
      ) : !activeCategory ? (
        <AdminEmptyPanel title="No categories" hint="Add a category to get started." />
      ) : categoryItems.length === 0 ? (
        <AdminEmptyPanel title="No dishes yet" hint="Tap Add dish to create one." />
      ) : (
        <div className="admin-mobile-catalog-list">
          {categoryItems.map((item) => (
            <CatalogItemRowCard
              key={item.id}
              item={item}
              dirty={false}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>
      )}

      <CatalogItemSheet
        open={Boolean(selectedItem)}
        item={selectedItem}
        saving={itemSave.busy}
        onClose={() => setSelectedItem(null)}
        onSave={handleSaveItem}
        onDeleteRequest={(item) => {
          setSelectedItem(null)
          setConfirmDelete({ type: 'item', item })
        }}
      />

      <CatalogCategorySheet
        open={Boolean(categorySheet)}
        category={categorySheet?.isNew ? null : categorySheet}
        itemCount={
          categorySheet && !categorySheet.isNew
            ? (catalog.itemsByCategory[categorySheet.id] ?? []).length
            : 0
        }
        saving={categorySave.busy}
        onClose={() => setCategorySheet(null)}
        onSave={async (data) => {
          const { ok, error, stale } = await categorySave.run(() =>
            onAddCategory?.(data),
          )
          if (!ok) {
            if (!stale) onError?.(error)
            return
          }
          if (stale) return
          setCategorySheet(null)
        }}
        onDeleteRequest={(cat) => {
          setCategorySheet(null)
          setConfirmDelete({ type: 'category', category: cat })
        }}
      />

      <CatalogAddItemSheet
        open={addItemOpen}
        categoryId={activeCategoryId}
        saving={addItemSave.busy}
        onClose={() => setAddItemOpen(false)}
        onAdd={async (data) => {
          const { ok, error, stale } = await addItemSave.run(() =>
            onAddItem?.(data),
          )
          if (!ok) {
            if (!stale) onError?.(error)
            return
          }
          if (stale) return
          setAddItemOpen(false)
        }}
      />

      <PlanningGroupsSheet
        open={groupsOpen}
        category={activeCategory}
        items={categoryItems}
        onClose={() => setGroupsOpen(false)}
        onSaved={onGroupsSaved}
        onError={onError}
      />

      <AdminConfirmSheet
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={confirmDelete?.type === 'category' ? 'Delete category?' : 'Remove dish?'}
        message={
          confirmDelete?.type === 'category'
            ? `Delete "${confirmDelete.category.labelEn}" and all its items?`
            : confirmDelete?.item
              ? `Remove "${confirmDelete.item.gu || confirmDelete.item.en}" from the menu?`
              : ''
        }
        confirmLabel={confirmDelete?.type === 'category' ? 'Delete' : 'Remove'}
        destructive
        busy={deleteSave.busy}
        onConfirm={async () => {
          if (!confirmDelete) return
          const { ok, error, stale } = await deleteSave.run(async () => {
            if (confirmDelete.type === 'category') {
              await onDeleteCategory?.(confirmDelete.category.id)
            } else {
              await onDeleteItem?.(confirmDelete.item.id)
            }
          })
          if (!ok) {
            if (!stale) onError?.(error)
            return
          }
          if (stale) return
          setConfirmDelete(null)
        }}
      />
    </div>
  )
}
