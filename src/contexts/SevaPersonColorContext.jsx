import { createContext, useContext, useMemo } from 'react'
import { buildPersonColorMap } from '../utils/sevaPersonColors'
import { useTheme } from './ThemeContext'

const SevaPersonColorContext = createContext(null)

export function SevaPersonColorProvider({ people, children }) {
  const { appearance } = useTheme()
  const peopleKey = people?.map((p) => p.id).join('|') ?? ''
  const colorMap = useMemo(
    () => buildPersonColorMap(people, appearance),
    [people, peopleKey, appearance],
  )

  return (
    <SevaPersonColorContext.Provider value={colorMap}>
      {children}
    </SevaPersonColorContext.Provider>
  )
}

export function useSevaPersonColor(personId) {
  const map = useContext(SevaPersonColorContext)
  if (!map || !personId) return null
  return map[personId] ?? null
}
