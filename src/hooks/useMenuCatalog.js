import { useMenuCatalogContext } from '../contexts/MenuCatalogContext'

/** Shared menu catalog — one Firestore subscription per session via MenuCatalogProvider. */
export function useMenuCatalog() {
  return useMenuCatalogContext()
}
