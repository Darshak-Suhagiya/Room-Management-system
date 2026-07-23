import { useEffect, useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useSaveMutation } from '../hooks/useSaveMutation'
import { VOTE_TYPES, VOTE_TYPE_LABELS, defaultVoteTypeForCategory } from '../config/voteTypes'
import {
  addCategory,
  addMenuItem,
  deleteCategory,
  deleteMenuItem,
  seedDefaultCatalog,
  updateMenuItem,
} from '../services/catalogService'
import { PlanningViewGroupsEditor } from '../components/PlanningViewGroupsEditor'
import { CatalogMobileView } from '../components/catalog/mobile'

function VoteTypeSegmented({ value, onChange }) {
  return (
    <div className="segmented-control vote-type-seg" role="group" aria-label="Vote type">
      <button
        type="button"
        className={`segmented-btn ${value === VOTE_TYPES.YES_NO ? 'is-active' : ''}`}
        onClick={() => onChange(VOTE_TYPES.YES_NO)}
      >
        {VOTE_TYPE_LABELS[VOTE_TYPES.YES_NO]}
      </button>
      <button
        type="button"
        className={`segmented-btn ${value === VOTE_TYPES.INTEGER ? 'is-active' : ''}`}
        onClick={() => onChange(VOTE_TYPES.INTEGER)}
      >
        {VOTE_TYPE_LABELS[VOTE_TYPES.INTEGER]}
      </button>
    </div>
  )
}

function itemIsDirty(item, en, gu, voteType, notes, recipe) {
  const baseVote = item.voteType ?? defaultVoteTypeForCategory(item.categoryId)
  return (
    en.trim() !== (item.en ?? '').trim() ||
    gu.trim() !== (item.gu ?? '').trim() ||
    voteType !== baseVote ||
    notes.trim() !== (item.notes ?? '').trim() ||
    recipe.trim() !== (item.recipe ?? '').trim()
  )
}

function ItemRow({ item, onSave, onDelete, onError }) {
  const [en, setEn] = useState(item.en)
  const [gu, setGu] = useState(item.gu)
  const [voteType, setVoteType] = useState(
    item.voteType ?? defaultVoteTypeForCategory(item.categoryId),
  )
  const [notes, setNotes] = useState(item.notes ?? '')
  const [recipe, setRecipe] = useState(item.recipe ?? '')
  const [expanded, setExpanded] = useState(
    Boolean((item.notes ?? '').trim() || (item.recipe ?? '').trim()),
  )
  const { busy: saving, run } = useSaveMutation()

  useEffect(() => {
    setEn(item.en)
    setGu(item.gu)
    setVoteType(item.voteType ?? defaultVoteTypeForCategory(item.categoryId))
    setNotes(item.notes ?? '')
    setRecipe(item.recipe ?? '')
  }, [item.id, item.en, item.gu, item.voteType, item.categoryId, item.notes, item.recipe])

  const dirty = itemIsDirty(item, en, gu, voteType, notes, recipe)
  const invalid = !gu.trim() || !en.trim()

  return (
    <li className={`catalog-item catalog-item-block ${invalid && dirty ? 'catalog-item-invalid' : ''}`}>
      <div className="catalog-item-main">
        <input
          value={gu}
          onChange={(e) => setGu(e.target.value)}
          placeholder="Gujarati name"
          className={invalid && dirty ? 'field-invalid' : ''}
        />
        <input
          value={en}
          onChange={(e) => setEn(e.target.value)}
          placeholder="English name"
          className={invalid && dirty ? 'field-invalid' : ''}
        />
        <VoteTypeSegmented value={voteType} onChange={setVoteType} />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide details' : 'Notes / recipe'}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={saving || !dirty || invalid}
          onClick={async () => {
            if (!gu.trim() || !en.trim()) {
              onError?.({ message: 'Gujarati and English names are required.' })
              return
            }
            const { ok, error, stale } = await run(() =>
              onSave(item.id, {
                en: en.trim(),
                gu: gu.trim(),
                voteType,
                notes: notes.trim(),
                recipe: recipe.trim(),
              }),
            )
            if (!ok && !stale) onError?.(error)
          }}
        >
          {saving ? '…' : 'Save'}
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(item)}
        >
          Remove
        </button>
      </div>
      {expanded && (
        <div className="catalog-item-details">
          <label className="field-stack">
            <span className="field-stack-label">Notes (Maharaj only)</span>
            <textarea
              className="app-textarea"
              rows={2}
              value={notes}
              placeholder="Prep notes, tips…"
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="field-stack">
            <span className="field-stack-label">Recipe (Maharaj only)</span>
            <textarea
              className="app-textarea"
              rows={3}
              value={recipe}
              placeholder="Recipe steps…"
              onChange={(e) => setRecipe(e.target.value)}
            />
          </label>
        </div>
      )}
    </li>
  )
}

function AddItemForm({ categoryId, onAdded, onError }) {
  const [en, setEn] = useState('')
  const [gu, setGu] = useState('')
  const [voteType, setVoteType] = useState(defaultVoteTypeForCategory(categoryId))
  const [notes, setNotes] = useState('')
  const [recipe, setRecipe] = useState('')
  const [showExtra, setShowExtra] = useState(false)

  return (
    <form
      className="inline-form catalog-add-form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!gu.trim() || !en.trim()) {
          onError({ message: 'Gujarati and English names are required.' })
          return
        }
        try {
          await addMenuItem({
            categoryId,
            en: en.trim(),
            gu: gu.trim(),
            voteType,
            notes: notes.trim(),
            recipe: recipe.trim(),
          })
          setEn('')
          setGu('')
          setNotes('')
          setRecipe('')
          setShowExtra(false)
          setVoteType(defaultVoteTypeForCategory(categoryId))
          onAdded()
        } catch (err) {
          onError(err)
        }
      }}
    >
      <div className="catalog-add-main">
        <input
          value={gu}
          onChange={(e) => setGu(e.target.value)}
          placeholder="Gujarati name"
          required
        />
        <input
          value={en}
          onChange={(e) => setEn(e.target.value)}
          placeholder="English name"
          required
        />
        <VoteTypeSegmented value={voteType} onChange={setVoteType} />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowExtra((v) => !v)}
        >
          {showExtra ? 'Hide details' : 'Notes / recipe'}
        </button>
        <button type="submit" className="btn btn-primary btn-sm">
          Add item
        </button>
      </div>
      {showExtra && (
        <div className="catalog-item-details">
          <label className="field-stack">
            <span className="field-stack-label">Notes (Maharaj only)</span>
            <textarea
              className="app-textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <label className="field-stack">
            <span className="field-stack-label">Recipe (Maharaj only)</span>
            <textarea
              className="app-textarea"
              rows={3}
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
            />
          </label>
        </div>
      )}
    </form>
  )
}

function confirmDelete(message) {
  return window.confirm(message)
}

function CatalogCategorySection({
  cat,
  catalog,
  notify,
  handleError,
  accordion = false,
}) {
  const items = catalog.itemsByCategory[cat.id] ?? []
  const itemCount = items.length

  const body = (
    <>
      <ul className="catalog-list">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            onSave={async (id, data) => {
              await updateMenuItem(id, data)
              notify('Item updated.')
            }}
            onError={handleError}
            onDelete={async (row) => {
              const label = row.gu || row.en || 'this item'
              if (
                !confirmDelete(
                  `Remove "${label}" from the menu? This cannot be undone.`,
                )
              ) {
                return
              }
              await deleteMenuItem(row.id)
              notify('Item removed.')
            }}
          />
        ))}
      </ul>

      <AddItemForm
        categoryId={cat.id}
        onAdded={() => notify('Item added.')}
        onError={handleError}
      />

      <PlanningViewGroupsEditor
        category={cat}
        items={items}
        onSaved={(msg) => notify(msg)}
        onError={handleError}
      />
    </>
  )

  if (accordion) {
    return (
      <details className="catalog-accordion" open={itemCount > 0}>
        <summary className="catalog-accordion-summary">
          <span className="catalog-accordion-title">
            {cat.labelGu} · {cat.labelEn}
          </span>
          <span className="catalog-accordion-meta muted">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </span>
        </summary>
        <div className="catalog-accordion-body">
          <div className="catalog-section-header catalog-accordion-actions">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={async () => {
                const msg =
                  items.length > 0
                    ? `Delete category "${cat.labelEn}" and all ${items.length} item(s)? This cannot be undone.`
                    : `Delete category "${cat.labelEn}"? This cannot be undone.`
                if (!confirmDelete(msg)) return
                try {
                  await deleteCategory(cat.id)
                  notify('Category removed.')
                } catch (err) {
                  handleError(err)
                }
              }}
            >
              Delete category
            </button>
          </div>
          {body}
        </div>
      </details>
    )
  }

  return (
    <section className="catalog-section">
      <div className="catalog-section-header">
        <h3>
          {cat.labelGu} · {cat.labelEn}
        </h3>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={async () => {
            const msg =
              items.length > 0
                ? `Delete category "${cat.labelEn}" and all ${items.length} item(s)? This cannot be undone.`
                : `Delete category "${cat.labelEn}"? This cannot be undone.`
            if (!confirmDelete(msg)) return
            try {
              await deleteCategory(cat.id)
              notify('Category removed.')
            } catch (err) {
              handleError(err)
            }
          }}
        >
          Delete category
        </button>
      </div>
      {body}
    </section>
  )
}

function AddCategoryForm({ notify, handleError }) {
  const [newCatEn, setNewCatEn] = useState('')
  const [newCatGu, setNewCatGu] = useState('')

  return (
    <section className="catalog-section catalog-add-category">
      <h3>Add category</h3>
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!newCatGu.trim() || !newCatEn.trim()) {
            handleError({ message: 'Category labels cannot be empty.' })
            return
          }
          try {
            await addCategory({
              labelEn: newCatEn.trim(),
              labelGu: newCatGu.trim(),
            })
            setNewCatEn('')
            setNewCatGu('')
            notify('Category added.')
          } catch (err) {
            handleError(err)
          }
        }}
      >
        <input
          value={newCatGu}
          onChange={(e) => setNewCatGu(e.target.value)}
          placeholder="Gujarati label"
          required
        />
        <input
          value={newCatEn}
          onChange={(e) => setNewCatEn(e.target.value)}
          placeholder="English label"
          required
        />
        <button type="submit" className="btn btn-primary btn-sm">
          Add category
        </button>
      </form>
    </section>
  )
}

export function AdminMenuCatalogPage() {
  const { catalog, loading, seeding, error } = useMenuCatalog({ autoSeed: true })
  const toast = useToast()
  const isMobile = useMediaQuery('(max-width: 899px)')

  const notify = (text) => toast.success(text)
  const handleError = (err) => toast.error(err.message ?? 'Invalid value.')

  if (loading) {
    return <p className="page-loading">Loading…</p>
  }

  const seedBanner =
    catalog.categories.length === 0 ? (
      <div className="seed-banner">
        <p>No menu items in database yet.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={async () => {
            try {
              await seedDefaultCatalog()
              notify('Default menu list imported.')
            } catch (err) {
              handleError(err)
            }
          }}
        >
          Import default menu list
        </button>
      </div>
    ) : null

  if (isMobile) {
    return (
      <div className="page admin-page admin-catalog-page">
        <CatalogMobileView
          catalog={catalog}
          seedBanner={seedBanner}
          seeding={seeding}
          error={error}
          onSaveItem={async (id, data) => {
            await updateMenuItem(id, data)
            notify('Item updated.')
          }}
          onDeleteItem={async (id) => {
            await deleteMenuItem(id)
            notify('Item removed.')
          }}
          onAddCategory={async (data) => {
            await addCategory(data)
            notify('Category added.')
          }}
          onDeleteCategory={async (id) => {
            await deleteCategory(id)
            notify('Category removed.')
          }}
          onAddItem={async (data) => {
            await addMenuItem(data)
            notify('Item added.')
          }}
          onGroupsSaved={notify}
          onError={handleError}
        />
      </div>
    )
  }

  const categorySections = catalog.categories.map((cat) => (
    <CatalogCategorySection
      key={cat.id}
      cat={cat}
      catalog={catalog}
      notify={notify}
      handleError={handleError}
    />
  ))

  return (
    <div className="page admin-page admin-catalog-page">
      <div className="layout-desktop">
        <header className="page-header">
          <h2>Menu editing</h2>
          <p>
            Add dishes and set vote type: Yes/No for shaak, Number for roti, etc.
            Optional notes and recipe are visible only to Maharaj on the vote dashboard.
          </p>
        </header>

        {seeding && <p className="muted">Importing default menu list…</p>}
        {error && <p className="form-error">{error}</p>}
        {seedBanner}
        <AddCategoryForm notify={notify} handleError={handleError} />
        {categorySections}
      </div>
    </div>
  )
}
