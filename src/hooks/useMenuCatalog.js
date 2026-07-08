import { useEffect, useMemo, useRef, useState } from 'react'
import {
  isCatalogEmpty,
  seedDefaultCatalog,
  subscribeCatalog,
} from '../services/catalogService'

const EMPTY_CATALOG = { categories: [], items: [], itemsByCategory: {} }

export function useMenuCatalog({ autoSeed = false } = {}) {
  const [catalog, setCatalog] = useState(EMPTY_CATALOG)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState('')
  const seedAttempted = useRef(false)

  useEffect(() => {
    setLoading(true)
    return subscribeCatalog(
      (data) => {
        setCatalog(data)
        setLoading(false)
      },
      (message) => {
        setError(message)
        setCatalog(EMPTY_CATALOG)
        setLoading(false)
      },
    )
  }, [])

  useEffect(() => {
    if (!autoSeed || loading || seeding || seedAttempted.current) return
    if (catalog.categories.length > 0) return

    seedAttempted.current = true
    let cancelled = false

    ;(async () => {
      setSeeding(true)
      try {
        const empty = await isCatalogEmpty()
        if (!cancelled && empty) {
          await seedDefaultCatalog()
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setSeeding(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [autoSeed, loading, catalog.categories.length, seeding])

  const categoryIds = useMemo(
    () => catalog.categories.map((c) => c.id),
    [catalog.categories],
  )

  return {
    catalog,
    loading,
    seeding,
    error,
    categoryIds,
    seedCatalog: async () => {
      setSeeding(true)
      setError('')
      try {
        await seedDefaultCatalog()
      } catch (err) {
        setError(err.message)
        throw err
      } finally {
        setSeeding(false)
      }
    },
  }
}
