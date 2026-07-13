export const ROLES = {
  ADMIN: 'admin',
  MAHARAJ: 'maharaj',
  RESIDENT: 'resident',
  KITCHEN_LEADER: 'kitchen_leader',
  ROOM_LEADER: 'room_leader',
}

export const USER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DEACTIVATED: 'deactivated',
}

export const COLLECTIONS = {
  USERS: 'users',
  MENUS: 'menus',
  MEAL_PARTICIPATION: 'mealParticipation',
  MENU_CATEGORIES: 'menuCategories',
  MENU_ITEMS: 'menuItems',
  SEVA_ROOM: 'sevaRoom',
  VOTE_LOCKS: 'voteLocks',
  LEAVE_ENTRIES: 'leaveEntries',
  NOTICES: 'notices',
}

export const NOTICE_TONES = {
  INFO: 'info',
  WARNING: 'warning',
  SUCCESS: 'success',
}

export const NOTICE_TONE_LABELS = {
  [NOTICE_TONES.INFO]: 'Info',
  [NOTICE_TONES.WARNING]: 'Warning',
  [NOTICE_TONES.SUCCESS]: 'Success',
}

export const NOTICE_PAGES = {
  MEALS: 'meals',
  SEVA: 'seva',
}

export const NOTICE_PAGE_LABELS = {
  [NOTICE_PAGES.MEALS]: 'My Meals',
  [NOTICE_PAGES.SEVA]: 'Room Seva',
}

export const LEAVE_PERIODS = {
  MORNING: 'morning',
  EVENING: 'evening',
  FULL: 'full',
}

export const LEAVE_PERIOD_LABELS = {
  [LEAVE_PERIODS.MORNING]: 'Morning',
  [LEAVE_PERIODS.EVENING]: 'Evening',
  [LEAVE_PERIODS.FULL]: 'Full day',
}
