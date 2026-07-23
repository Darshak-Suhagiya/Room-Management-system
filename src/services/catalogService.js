import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { COLLECTIONS } from '../config/constants'
import { DEFAULT_CATEGORIES, DEFAULT_ITEMS } from '../config/defaultMenuSeed'
import { defaultVoteTypeForCategory } from '../config/voteTypes'

const EMPTY_CATALOG = { categories: [], items: [], itemsByCategory: {} }

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function parseCatalogSnapshot(categorySnap, itemSnap) {
  const categories = categorySnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const items = itemSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const itemsByCategory = {}
  for (const cat of categories) {
    itemsByCategory[cat.id] = items.filter((i) => i.categoryId === cat.id)
  }

  return { categories, items, itemsByCategory }
}

export async function fetchCatalog() {
  if (!isFirebaseConfigured || !db) {
    return { ...EMPTY_CATALOG }
  }
  const [categorySnap, itemSnap] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.MENU_CATEGORIES)),
    getDocs(collection(db, COLLECTIONS.MENU_ITEMS)),
  ])
  return parseCatalogSnapshot(categorySnap, itemSnap)
}

export function subscribeCatalog(onData, onError) {
  if (!isFirebaseConfigured || !db) {
    onData({ ...EMPTY_CATALOG })
    return () => {}
  }

  let active = true

  const load = async () => {
    if (!active) return
    try {
      onData(await fetchCatalog())
    } catch (err) {
      console.error('Catalog load failed:', err)
      onData({ ...EMPTY_CATALOG })
      onError?.(err.message ?? 'Failed to load menu catalog')
    }
  }

  const handleSnapshotError = (err) => {
    console.error('Catalog snapshot error:', err)
    onData({ ...EMPTY_CATALOG })
    onError?.(err.message ?? 'Failed to listen to menu catalog')
  }

  const unsubCat = onSnapshot(
    collection(db, COLLECTIONS.MENU_CATEGORIES),
    () => load(),
    handleSnapshotError,
  )
  const unsubItems = onSnapshot(
    collection(db, COLLECTIONS.MENU_ITEMS),
    () => load(),
    handleSnapshotError,
  )
  load()

  return () => {
    active = false
    unsubCat()
    unsubItems()
  }
}

export async function isCatalogEmpty() {
  const catalog = await fetchCatalog()
  return catalog.categories.length === 0
}

export async function seedDefaultCatalog() {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }
  const batch = writeBatch(db)

  for (const cat of DEFAULT_CATEGORIES) {
    batch.set(doc(db, COLLECTIONS.MENU_CATEGORIES, cat.id), {
      labelEn: cat.labelEn,
      labelGu: cat.labelGu,
      order: cat.order,
    })
  }

  DEFAULT_ITEMS.forEach((item, index) => {
    batch.set(doc(db, COLLECTIONS.MENU_ITEMS, item.id), {
      categoryId: item.categoryId,
      en: item.en,
      gu: item.gu,
      voteType:
        item.voteType ?? defaultVoteTypeForCategory(item.categoryId),
      order: index,
    })
  })

  await batch.commit()
}

export async function addCategory({ labelEn, labelGu }) {
  const id = slugify(labelEn) || `cat-${Date.now()}`
  const existing = await fetchCatalog()
  await setDoc(doc(db, COLLECTIONS.MENU_CATEGORIES, id), {
    labelEn,
    labelGu,
    order: existing.categories.length + 1,
  })
  return id
}

export async function updateCategory(categoryId, data) {
  await setDoc(doc(db, COLLECTIONS.MENU_CATEGORIES, categoryId), data, {
    merge: true,
  })
}

export async function deleteCategory(categoryId) {
  const catalog = await fetchCatalog()
  const hasItems = catalog.items.some((i) => i.categoryId === categoryId)
  if (hasItems) {
    throw new Error('Remove all items in this category first')
  }
  await deleteDoc(doc(db, COLLECTIONS.MENU_CATEGORIES, categoryId))
}

export async function addMenuItem({
  categoryId,
  en,
  gu,
  voteType,
  notes = '',
  recipe = '',
}) {
  const id = slugify(en) || `item-${Date.now()}`
  const catalog = await fetchCatalog()
  const inCategory = catalog.items.filter((i) => i.categoryId === categoryId)
  await setDoc(doc(db, COLLECTIONS.MENU_ITEMS, id), {
    categoryId,
    en,
    gu,
    voteType: voteType ?? defaultVoteTypeForCategory(categoryId),
    notes: (notes ?? '').trim(),
    recipe: (recipe ?? '').trim(),
    order: inCategory.length + 1,
  })
  return id
}

export async function updateMenuItem(itemId, data) {
  await setDoc(doc(db, COLLECTIONS.MENU_ITEMS, itemId), data, { merge: true })
}

export async function deleteMenuItem(itemId) {
  await deleteDoc(doc(db, COLLECTIONS.MENU_ITEMS, itemId))
}

/**
 * Save optional planning view-groups for a category (Menu Planning UI only).
 * groups: [{ id, label, order }]
 * assignments: { [itemId]: groupId | null }
 * If groups is empty, clears planningGroupId on all items in the category.
 */
export async function saveCategoryPlanningGroups(
  categoryId,
  groups,
  assignments,
) {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured')
  }

  const catalog = await fetchCatalog()
  const categoryItems = catalog.items.filter((i) => i.categoryId === categoryId)
  const normalized = (groups ?? [])
    .map((g, index) => ({
      id: String(g.id ?? `grp-${index + 1}`),
      label: String(g.label ?? '').trim(),
      order: typeof g.order === 'number' ? g.order : index,
    }))
    .filter((g) => g.label)

  if (normalized.length > 0) {
    const groupIds = new Set(normalized.map((g) => g.id))
    const missing = []
    for (const item of categoryItems) {
      const gid = assignments?.[item.id]
      if (!gid || !groupIds.has(gid)) {
        missing.push(item.gu || item.en || item.id)
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Assign every item to a group. Missing: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`,
      )
    }
  }

  const batch = writeBatch(db)
  batch.set(
    doc(db, COLLECTIONS.MENU_CATEGORIES, categoryId),
    { planningGroups: normalized },
    { merge: true },
  )

  for (const item of categoryItems) {
    const gid =
      normalized.length === 0 ? null : (assignments?.[item.id] ?? null)
    batch.set(
      doc(db, COLLECTIONS.MENU_ITEMS, item.id),
      {
        planningGroupId:
          gid == null || gid === '' ? deleteField() : gid,
      },
      { merge: true },
    )
  }

  await batch.commit()
}
