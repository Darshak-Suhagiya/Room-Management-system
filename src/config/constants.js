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
  FINANCE_SETTINGS: 'financeSettings',
  DEPOSIT_ACCOUNTS: 'depositAccounts',
  DEPOSIT_MOVEMENTS: 'depositMovements',
  EXPENSE_TEMPLATES: 'expenseTemplates',
  EXPENSES: 'expenses',
  FINANCE_COLLECTIONS: 'financeCollections',
  FINANCE_DUES: 'financeDues',
  FINANCE_PAYMENTS: 'financePayments',
  ROOM_WALLET: 'roomWallet',
  ROOM_WALLET_MOVEMENTS: 'roomWalletMovements',
  MEMBER_WALLETS: 'memberWallets',
  MEMBER_WALLET_MOVEMENTS: 'memberWalletMovements',
  FINANCE_FUND_REPAIRS: 'financeFundRepairs',
  FINANCE_WALLET_REPAYMENTS: 'financeWalletRepayments',
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

export const PUSH_SOURCES = {
  MANUAL_QUICK: 'manual_quick',
  MANUAL_COMPOSE: 'manual_compose',
  NOTICE: 'notice',
  SHOPPING: 'shopping',
  MENU_UPDATE: 'menu_update',
  SYSTEM: 'system',
  FINANCE: 'finance',
}

export const PUSH_SOURCE_LABELS = {
  [PUSH_SOURCES.MANUAL_QUICK]: 'Quick send',
  [PUSH_SOURCES.MANUAL_COMPOSE]: 'Custom send',
  [PUSH_SOURCES.NOTICE]: 'Notice',
  [PUSH_SOURCES.SHOPPING]: 'Shopping assign',
  [PUSH_SOURCES.MENU_UPDATE]: 'Menu update',
  [PUSH_SOURCES.SYSTEM]: 'Automatic',
  [PUSH_SOURCES.FINANCE]: 'Finance dues',
}

export const PUSH_RECIPIENT_STATUS = {
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
  NO_TOKENS: 'no_tokens',
}

export const PUSH_RECIPIENT_STATUS_LABELS = {
  [PUSH_RECIPIENT_STATUS.SUCCESS]: 'Success',
  [PUSH_RECIPIENT_STATUS.PARTIAL]: 'Partial',
  [PUSH_RECIPIENT_STATUS.FAILED]: 'Failed',
  [PUSH_RECIPIENT_STATUS.NO_TOKENS]: 'No tokens',
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

export const FINANCE_SPLIT_MODES = {
  EQUAL: 'equal',
  SHARES: 'shares',
  MANUAL: 'manual',
}

export const FINANCE_SPLIT_MODE_LABELS = {
  [FINANCE_SPLIT_MODES.EQUAL]: 'Equal',
  [FINANCE_SPLIT_MODES.SHARES]: 'Shares',
  [FINANCE_SPLIT_MODES.MANUAL]: 'Manual',
}

export const DEPOSIT_MOVEMENT_TYPES = {
  COLLECT: 'collect',
  REPAY: 'repay',
  TOPUP: 'topup',
  ADJUST: 'adjust',
}

export const DEPOSIT_ACCOUNT_STATUS = {
  ACTIVE: 'active',
  PARTIAL: 'partial',
  REFUNDED: 'refunded',
}

export const EXPENSE_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
}

export const COLLECTION_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  CLOSED: 'closed',
}

export const DUE_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  COVERED: 'covered',
  WAIVED: 'waived',
}

export const WALLET_MOVEMENT_REASONS = {
  ROUNDING: 'rounding',
  CONTRIBUTION: 'contribution',
  EXPENSE: 'expense',
  REFUND: 'refund',
  ADJUST: 'adjust',
  COVER: 'cover',
  RECOVER: 'recover',
  REPAY: 'repay',
  COOK_LEAVE: 'cook_leave',
  FROM_FUND: 'from_fund',
}

export const WALLET_MOVEMENT_REASON_LABELS = {
  [WALLET_MOVEMENT_REASONS.ROUNDING]: 'Rounding',
  [WALLET_MOVEMENT_REASONS.CONTRIBUTION]: 'Contribution',
  [WALLET_MOVEMENT_REASONS.EXPENSE]: 'Expense',
  [WALLET_MOVEMENT_REASONS.REFUND]: 'Refund',
  [WALLET_MOVEMENT_REASONS.ADJUST]: 'Adjust',
  [WALLET_MOVEMENT_REASONS.COVER]: 'Covered unpaid share',
  [WALLET_MOVEMENT_REASONS.RECOVER]: 'Recovered from payment',
  [WALLET_MOVEMENT_REASONS.REPAY]: 'Wallet repayment',
  [WALLET_MOVEMENT_REASONS.COOK_LEAVE]: 'Cook leave held back',
  [WALLET_MOVEMENT_REASONS.FROM_FUND]: 'Paid from room fund',
}

export const MEMBER_WALLET_REASONS = {
  CARRY_IN: 'carry_in',
  SETTLE: 'settle',
  WAIVE_RELEASE: 'waive_release',
  UNWAIVE: 'unwaive',
  ADJUST: 'adjust',
  REPAY: 'repay',
}

export const MEMBER_WALLET_REASON_LABELS = {
  [MEMBER_WALLET_REASONS.CARRY_IN]: 'Applied to collection',
  [MEMBER_WALLET_REASONS.SETTLE]: 'Closed collection',
  [MEMBER_WALLET_REASONS.WAIVE_RELEASE]: 'Released on waive',
  [MEMBER_WALLET_REASONS.UNWAIVE]: 'Re-applied on restore',
  [MEMBER_WALLET_REASONS.ADJUST]: 'Adjust',
  [MEMBER_WALLET_REASONS.REPAY]: 'Paid to room fund',
}

export const PAYMENT_METHODS = {
  UPI: 'upi',
  CASH: 'cash',
  BANK: 'bank',
  OTHER: 'other',
}

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.UPI]: 'UPI',
  [PAYMENT_METHODS.CASH]: 'Cash',
  [PAYMENT_METHODS.BANK]: 'Bank',
  [PAYMENT_METHODS.OTHER]: 'Other',
}

export const PAYMENT_SOURCES = {
  MEMBER: 'member',
  ROOM_FUND: 'room_fund',
}

export const PAYMENT_SOURCE_LABELS = {
  [PAYMENT_SOURCES.MEMBER]: 'Member',
  [PAYMENT_SOURCES.ROOM_FUND]: 'Room fund',
}

export const WALLET_REPAYMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
}

export const ROUND_DIRECTIONS = {
  UP: 'up',
  DOWN: 'down',
  NEAREST: 'nearest',
}

export const DEFAULT_ROUND_PRESETS = [
  { id: 'exact', label: 'Exact', mode: 'exact' },
  { id: 'up-1', label: 'Up to ₹1', mode: 'step', stepPaise: 100, direction: 'up' },
  { id: 'up-5', label: 'Up to ₹5', mode: 'step', stepPaise: 500, direction: 'up' },
  { id: 'up-10', label: 'Up to ₹10', mode: 'step', stepPaise: 1000, direction: 'up' },
  { id: 'up-50', label: 'Up to ₹50', mode: 'step', stepPaise: 5000, direction: 'up' },
  { id: 'up-100', label: 'Up to ₹100', mode: 'step', stepPaise: 10000, direction: 'up' },
  { id: 'down-1', label: 'Down to ₹1', mode: 'step', stepPaise: 100, direction: 'down' },
  { id: 'down-5', label: 'Down to ₹5', mode: 'step', stepPaise: 500, direction: 'down' },
  { id: 'down-10', label: 'Down to ₹10', mode: 'step', stepPaise: 1000, direction: 'down' },
]

export const DEFAULT_FINANCE_SETTINGS = {
  standardDepositPaise: 500000,
  defaultDueDays: 7,
  roundPresets: DEFAULT_ROUND_PRESETS,
  reminderConfig: {
    enabled: true,
    daysBefore: 1,
    remindOnDue: true,
    overdueEveryDays: 3,
    hourIst: 9,
  },
  allowNegativeWallet: false,
}

export const DEFAULT_EXPENSE_TEMPLATES = [
  {
    id: 'rent',
    name: 'Rent',
    defaultAmountPaise: 0,
    defaultSplitMode: FINANCE_SPLIT_MODES.EQUAL,
    recurring: true,
    order: 0,
    active: true,
  },
  {
    id: 'cook',
    name: 'Cook salary',
    defaultAmountPaise: 0,
    defaultSplitMode: FINANCE_SPLIT_MODES.EQUAL,
    recurring: true,
    order: 1,
    active: true,
  },
  {
    id: 'gas',
    name: 'Gas',
    defaultAmountPaise: 0,
    defaultSplitMode: FINANCE_SPLIT_MODES.EQUAL,
    recurring: true,
    order: 2,
    active: true,
  },
  {
    id: 'light',
    name: 'Light / electricity',
    defaultAmountPaise: 0,
    defaultSplitMode: FINANCE_SPLIT_MODES.EQUAL,
    recurring: true,
    order: 3,
    active: true,
  },
]
