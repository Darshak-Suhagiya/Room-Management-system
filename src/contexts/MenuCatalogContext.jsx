import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  isCatalogEmpty,
  seedDefaultCatalog,
  subscribeCatalog,
} from '../services/catalogService'
import { useAuth } from './AuthContext'

const EMPTY_CATALOG = { categories: [], items: [], itemsByCategory: {} }

const MenuCatalogContext = createContext(null)

export function MenuCatalogProvider({ children, autoSeed = false }) {
  const { user, loading: authLoading } = useAuth()
  const [catalog, setCatalog] = useState(EMPTY_CATALOG)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState('')
  const seedAttempted = useRef(false)

  useEffect(() => {
    if (authLoading) return undefined

    if (!user) {
      setCatalog(EMPTY_CATALOG)
      setLoading(false)
      setError('')
      setSeeding(false)
      seedAttempted.current = false
      return undefined
    }

    setLoading(true)
    setError('')
    seedAttempted.current = false

    return subscribeCatalog(
      (data) => {
        setCatalog(data)
        setError('')
        setLoading(false)
      },
      (message) => {
        setError(message)
        setCatalog(EMPTY_CATALOG)
        setLoading(false)
      },
    )
  }, [user, authLoading])

  useEffect(() => {
    if (!user || authLoading) return undefined
    if (!autoSeed || loading || seeding || seedAttempted.current) return undefined
    if (catalog.categories.length > 0) return undefined

    seedAttempted.current = true
    let cancelled = false

    ;(async () => {
      setSeeding(true)
      try {
        const empty = await isCatalogEmpty()
        if (!cancelled && empty) {
          await seedDefaultCatalog()
        }
        if (!cancelled) setError('')
      } catch (err) {
        if (!cancelled) {
          seedAttempted.current = false
          setError(err.message)
        }
      } finally {
        if (!cancelled) setSeeding(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, authLoading, autoSeed, loading, catalog.categories.length, seeding])

  const categoryIds = useMemo(
    () => catalog.categories.map((c) => c.id),
    [catalog.categories],
  )

  const seedCatalog = async () => {
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
  }

  const value = useMemo(
    () => ({
      catalog,
      loading: authLoading || loading,
      seeding,
      error,
      categoryIds,
      seedCatalog,
    }),
    [catalog, authLoading, loading, seeding, error, categoryIds],
  )

  return (
    <MenuCatalogContext.Provider value={value}>
      {children}
    </MenuCatalogContext.Provider>
  )
}

export function useMenuCatalogContext() {
  const ctx = useContext(MenuCatalogContext)
  if (!ctx) {
    throw new Error('useMenuCatalogContext must be used within MenuCatalogProvider')
  }
  return ctx
}
