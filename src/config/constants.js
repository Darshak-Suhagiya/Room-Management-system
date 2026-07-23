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
  PUSH_SETTINGS: 'pushSettings',
  PUSH_JOBS: 'pushJobs',
  PUSH_LOGS: 'pushLogs',
  PUSH_DIGEST_CURSOR: 'pushDigestCursor',
  STOCK_GROUPS: 'stockGroups',
  STOCK_ITEMS: 'stockItems',
  STOCK_MOVEMENTS: 'stockMovements',
  SHOPPING_TICKETS: 'shoppingTickets',
}

export const STOCK_UNITS = {
  G: 'g',
  KG: 'kg',
  COUNT: 'count',
}

export const STOCK_UNIT_LABELS = {
  [STOCK_UNITS.G]: 'g',
  [STOCK_UNITS.KG]: 'kg',
  [STOCK_UNITS.COUNT]: 'pcs',
}

export const STOCK_ITERATION_PERIODS = {
  WEEK: 'week',
  MONTH: 'month',
}

export const STOCK_MOVEMENT_REASONS = {
  FILL: 'fill',
  USE: 'use',
  PLAN_CONSUME: 'plan_consume',
  PLAN_REVERSE: 'plan_reverse',
  SHOPPING: 'shopping',
}

export const SHOPPING_TICKET_STATUS = {
  OPEN: 'open',
  DONE: 'done',
  CANCELLED: 'cancelled',
}

export const DEFAULT_STOCK_GROUPS = [
  { id: 'groceries', name: 'Groceries', linkToMenu: true, order: 0 },
  { id: 'vegetables', name: 'Vegetables', linkToMenu: true, order: 1 },
]

export const PUSH_AUDIENCE_TYPES = {
  ALL: 'all',
  NOT_VOTED: 'not_voted',
  ROLES: 'roles',
  USERS: 'users',
}

export const PUSH_JOB_KINDS = {
  CUSTOM: 'custom',
  MENU_DIGEST: 'menu_digest',
  DAILY_DIGEST: 'daily_digest',
}

export const PUSH_JOB_STATUS = {
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
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
