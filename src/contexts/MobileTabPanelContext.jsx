import { createContext, useContext } from 'react'

const MobileTabPanelContext = createContext(true)

/** False when a cached bottom-nav panel is hidden (another tab is active). */
export function MobileTabPanelProvider({ isActive, children }) {
  return (
    <MobileTabPanelContext.Provider value={isActive}>
      {children}
    </MobileTabPanelContext.Provider>
  )
}

export function useMobileTabPanelActive() {
  return useContext(MobileTabPanelContext)
}
