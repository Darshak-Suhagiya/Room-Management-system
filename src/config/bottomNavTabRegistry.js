/** @deprecated Import from appNavRegistry.js */
export {
  MEALS_TAB_ID,
  VOTES_TAB_ID,
  ALL_NAV_PATHS,
  ALL_NAV_PATHS as RESIDENT_BOTTOM_NAV_PATHS,
  buildAuthSnapshot,
  getNavPool,
  getSidebarSections,
  getDefaultBottomNavIds,
  getRequiredTabId,
  getBottomNavLimits,
  getHomeTabPath,
  resolveTabsFromIds,
  getNavDefById,
  NAV_GUARD_PROPS,
} from './appNavRegistry'

// Legacy aliases
export {
  getNavPool as getResidentTabPool,
  getDefaultBottomNavIds as getDefaultResidentTabIds,
} from './appNavRegistry'
