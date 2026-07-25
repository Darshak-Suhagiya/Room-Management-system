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
  LIT: 'lit',
  PKT: 'pkt',
  COUNT: 'count',
}

export const STOCK_UNIT_LABELS = {
  [STOCK_UNITS.G]: 'g',
  [STOCK_UNITS.KG]: 'kg',
  [STOCK_UNITS.LIT]: 'lit',
  [STOCK_UNITS.PKT]: 'pkt',
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
  { id: 'vaghar-masala', name: 'વઘારના મસાલા', linkToMenu: true, order: 0 },
  { id: 'powder-masala', name: 'પાવડર મસાલા', linkToMenu: true, order: 1 },
  { id: 'lot-aato', name: 'લોટ / આટો', linkToMenu: true, order: 2 },
  { id: 'dal-kathol', name: 'દાળ / કઠોળ', linkToMenu: true, order: 3 },
  { id: 'anaj-chokha', name: 'અનાજ / ચોખા', linkToMenu: true, order: 4 },
  { id: 'suka-meva', name: 'સૂકા મેવા / બીજ', linkToMenu: true, order: 5 },
  { id: 'dabba-packet', name: 'ડબ્બા / પેકેટ', linkToMenu: true, order: 6 },
  { id: 'cha-coffee', name: 'ચા / કોફી / પીણાં', linkToMenu: true, order: 7 },
  { id: 'room-safai', name: 'રૂમ સફાઈ', linkToMenu: false, order: 8 },
  { id: 'vegetables', name: 'Vegetables', linkToMenu: true, order: 9 },
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
