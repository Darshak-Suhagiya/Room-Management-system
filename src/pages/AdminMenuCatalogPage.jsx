import { useEffect, useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useMenuCatalog } from '../hooks/useMenuCatalog'
import { VOTE_TYPES, VOTE_TYPE_LABELS, defaultVoteTypeForCategory } from '../config/voteTypes'
import {
  addCategory,
  addMenuItem,
  deleteCategory,
  deleteMenuItem,
  seedDefaultCatalog,
  updateMenuItem,
} from '../services/catalogService'

function VoteTypeSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value={VOTE_TYPES.YES_NO}>{VOTE_TYPE_LABELS[VOTE_TYPES.YES_NO]}</option>
      <option value={VOTE_TYPES.INTEGER}>
        {VOTE_TYPE_LABELS[VOTE_TYPES.INTEGER]}
      </option>
    </select>
  )
}

function itemIsDirty(item, en, gu, voteType) {
  const baseVote = item.voteType ?? defaultVoteTypeForCategory(item.categoryId)
  return (
    en.trim() !== (item.en ?? '').trim() ||
    gu.trim() !== (item.gu ?? '').trim() ||
    voteType !== baseVote
  )
}

function ItemRow({ item, onSave, onDelete, onError }) {
  const [en, setEn] = useState(item.en)
  const [gu, setGu] = useState(item.gu)
  const [voteType, setVoteType] = useState(
    item.voteType ?? defaultVoteTypeForCategory(item.categoryId),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEn(item.en)
    setGu(item.gu)
    setVoteType(item.voteType ?? defaultVoteTypeForCategory(item.categoryId))
  }, [item.id, item.en, item.gu, item.voteType, item.categoryId])

  const dirty = itemIsDirty(item, en, gu, voteType)
  const invalid = !gu.trim() || !en.trim()

  return (
    <li className={`catalog-item ${invalid && dirty ? 'catalog-item-invalid' : ''}`}>
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
      <VoteTypeSelect value={voteType} onChange={setVoteType} />
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={saving || !dirty || invalid}
        onClick={async () => {
          if (!gu.trim() || !en.trim()) {
            onError?.({ message: 'Gujarati and English names are required.' })
            return
          }
          setSaving(true)
          try {
            await onSave(item.id, { en: en.trim(), gu: gu.trim(), voteType })
          } catch (err) {
            onError?.(err)
          } finally {
            setSaving(false)
          }
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
    </li>
  )
}

function AddItemForm({ categoryId, onAdded, onError }) {
  const [en, setEn] = useState('')
  const [gu, setGu] = useState('')
  const [voteType, setVoteType] = useState(defaultVoteTypeForCategory(categoryId))

  return (
    <form
      className="inline-form"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!gu.trim() || !en.trim()) {
          onError({ message: 'Gujarati and English names are required.' })
          return
        }
        try {
          await addMenuItem({ categoryId, en: en.trim(), gu: gu.trim(), voteType })
          setEn('')
          setGu('')
          setVoteType(defaultVoteTypeForCategory(categoryId))
          onAdded()
        } catch (err) {
          onError(err)
        }
      }}
    >
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
      <VoteTypeSelect value={voteType} onChange={setVoteType} />
      <button type="submit" className="btn btn-primary btn-sm">
        Add item
      </button>
    </form>
  )
}

function confirmDelete(message) {
  return window.confirm(message)
}

export function AdminMenuCatalogPage() {
  const { catalog, loading, seeding, error } = useMenuCatalog({ autoSeed: true })
  const toast = useToast()
  const [newCatEn, setNewCatEn] = useState('')
  const [newCatGu, setNewCatGu] = useState('')

  const notify = (text) => toast.success(text)
  const handleError = (err) => toast.error(err.message ?? 'Invalid value.')

  if (loading) {
    return <p className="page-loading">Loading…</p>
  }

  return (
    <div className="page admin-page">
      <header className="page-header">
        <h2>Menu editing</h2>
        <p>
          Add dishes and set vote type: Yes/No for shaak, Number for roti, etc.
          Save is enabled only after you change a row.
        </p>
      </header>

      {seeding && <p className="muted">Importing default menu list…</p>}
      {error && <p className="form-error">{error}</p>}

      {catalog.categories.length === 0 && (
        <div className="seed-banner">
          <p>No menu items in database yet.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              try {
                await seedDefaultCatalog()
                notify('Default menu list imported to Firestore.')
              } catch (err) {
                handleError(err)
              }
            }}
          >
            Import default menu list
          </button>
        </div>
      )}

      <section className="catalog-section">
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

      {catalog.categories.map((cat) => (
        <section key={cat.id} className="catalog-section">
          <div className="catalog-section-header">
            <h3>
              {cat.labelGu} · {cat.labelEn}
            </h3>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={async () => {
                const items = catalog.itemsByCategory[cat.id] ?? []
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

          <ul className="catalog-list">
            {(catalog.itemsByCategory[cat.id] ?? []).map((item) => (
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
        </section>
      ))}
    </div>
  )
}
