import { getDefaultPrefillRules } from './prefillRuleTypes'

/** Default Room Seva schedule — seeded from Google Sheet "Seva Room" */

function pid(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
}

function slot(personKey, note = '') {
  return { personId: personKey, note }
}

const PEOPLE = [
  { id: pid('Darshak'), name: 'Darshak', userId: null },
  { id: pid('Chintan'), name: 'Chintan', userId: null },
  { id: pid('Jay B'), name: 'Jay B', userId: null },
  { id: pid('Tirth'), name: 'Tirth', userId: null },
  { id: pid('Bhavya'), name: 'Bhavya', userId: null },
  { id: pid('Harsh'), name: 'Harsh', userId: null },
  { id: pid('Manan'), name: 'Manan', userId: null },
  { id: pid('Vaidik'), name: 'Vaidik', userId: null },
  { id: pid('Jenish'), name: 'Jenish', userId: null },
  { id: pid('Prashant'), name: 'Prashant', userId: null },
]

const P = Object.fromEntries(PEOPLE.map((p) => [p.name, p.id]))

const DAILY_GROUPS = [
  {
    id: 's1',
    code: 'S1',
    description: 'વાસણ ધોવા, રસોઈના વાસણ ખાલી કરવા, ચોકડી સફાઈ',
    slotCount: 4,
    loadKey: 'S1',
    sortOrder: 0,
  },
  {
    id: 's2_r1',
    code: 'S2_R1',
    description:
      'સફાઈ ( હોલ, રસોડુ, 3-રૂમ, ગેલેરી), એક્સ્ટ્રા 3 ટાંકીના વાલ બંધ કરવા',
    slotCount: 4,
    loadKey: 'S2',
    sortOrder: 1,
  },
  {
    id: 'extra',
    code: 'Extra',
    description: 'ગેરહાજર વ્યક્તિની જગ્યાએ સેવા',
    slotCount: 1,
    loadKey: null,
    optional: true,
    sortOrder: 2,
  },
  {
    id: 's3',
    code: 'S3',
    description:
      'પ્લેટફોર્મ સફાઈ + કચરાપેટી બહાર મૂકવી,વાસણ ગોઠવવા + ફિલ્ટર સફાઈ + બહારની બેસિન સફાઈ',
    slotCount: 4,
    loadKey: 'S3',
    sortOrder: 3,
  },
  {
    id: 's4_w',
    code: 'S4_W',
    description: 'એટેચ બાથરૂમ સફાઈ',
    slotCount: 1,
    loadKey: 'S4',
    sortOrder: 4,
  },
  {
    id: 's4_ind',
    code: 'S4_Ind',
    description: 'ઇન્ડિયન ટોયલેટ સફાઈ',
    slotCount: 1,
    loadKey: 'S4',
    sortOrder: 5,
  },
]

const WEEK_DAYS = [
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
]

const LOAD_COLUMNS = ['S1', 'S2', 'S3', 'S4', 'S5']

function emptyDaySlots() {
  const day = {}
  for (const g of DAILY_GROUPS) {
    day[g.id] = Array.from({ length: g.slotCount }, () => ({
      personId: null,
      note: '',
    }))
  }
  return day
}

const ASSIGNMENTS = {
  monday: {
    s1: [
      slot(P.Tirth),
      slot(P['Jay B']),
      slot(P.Chintan),
      slot(P.Prashant, 'બહારનું'),
    ],
    s2_r1: [slot(P.Darshak), slot(P.Bhavya), slot(P.Harsh), slot(P.Tirth)],
    extra: [slot(null)],
    s3: [slot(P.Manan), slot(P.Vaidik), slot(P.Jenish), slot(P.Harsh)],
  },
  tuesday: {
    s1: [
      slot(P.Chintan),
      slot(P.Manan),
      slot(P.Bhavya),
      slot(P.Darshak, 'અંદરનું'),
    ],
    s2_r1: [
      slot(P['Jay B']),
      slot(P.Tirth),
      slot(P.Prashant),
      slot(P.Vaidik),
    ],
    extra: [slot(null)],
    s3: [slot(P['Jay B']), slot(P.Harsh), slot(P.Vaidik), slot(P.Jenish)],
  },
  wednesday: {
    s1: [
      slot(P.Darshak),
      slot(P['Jay B']),
      slot(P.Prashant),
      slot(P.Jenish, 'બહારનું'),
    ],
    s2_r1: [slot(P.Chintan), slot(P.Harsh), slot(P.Vaidik), slot(null)],
    extra: [slot(null)],
    s3: [slot(P.Tirth), slot(P.Bhavya), slot(P.Manan)],
  },
  thursday: {
    s1: [
      slot(P.Bhavya),
      slot(P.Vaidik),
      slot(P.Harsh),
      slot(P.Chintan, 'અંદરનું'),
    ],
    s2_r1: [slot(P.Jenish), slot(P.Prashant), slot(P.Manan)],
    extra: [slot(null)],
    s3: [slot(P.Darshak), slot(P.Chintan), slot(P.Tirth)],
  },
  friday: {
    s1: [slot(P.Jenish), slot(P.Tirth), slot(P.Manan)],
    s2_r1: [slot(P.Vaidik), slot(P.Jenish), slot(P.Darshak)],
    extra: [slot(null)],
    s3: [slot(P.Prashant), slot(P.Chintan), slot(P.Bhavya)],
  },
}

// Normalize slot arrays to match group slotCount
for (const dayId of Object.keys(ASSIGNMENTS)) {
  for (const g of DAILY_GROUPS) {
    const rows = ASSIGNMENTS[dayId][g.id] ?? []
    while (rows.length < g.slotCount) {
      rows.push(slot(null))
    }
    ASSIGNMENTS[dayId][g.id] = rows.slice(0, g.slotCount)
  }
}

const WEEKLY_TASKS = [
  { id: 'wt_kothari', title: 'કોઠારીઓ', personIds: [P.Darshak, P.Harsh] },
  { id: 'wt_bhandari', title: 'ભંડારીઓ', personIds: [P.Manan, P['Jay B']] },
  {
    id: 'wt_sabji',
    title: 'શાકભાજી લાવવા અને ફ્રીજમાં મુકવા',
    personIds: [P.Jenish, P.Vaidik],
  },
  { id: 'wt_dmart', title: 'D Mart', personIds: [P.Bhavya, P.Tirth] },
  { id: 'wt_freeze1', title: 'ફ્રીઝ સફાઈ', personIds: [P.Prashant] },
  {
    id: 'wt_lot',
    title: 'લોટ અને સફાઈ કરી ડબ્બામાં ભરવો',
    personIds: [P.Manan],
  },
  {
    id: 'wt_jala',
    title: 'જાળા સફાઈ (બધી દીવાલો)',
    personIds: [P.Vaidik, P.Prashant],
  },
  { id: 'wt_pankha', title: 'પંખા સફાઈ', personIds: [P['Jay B'], P.Tirth] },
  {
    id: 'wt_bhandar1',
    title: 'ભંડાર ખાના સફાઈ - 1 (ફ્રીઝ)',
    personIds: [P.Tirth],
  },
  {
    id: 'wt_bhandar2',
    title: 'ભંડાર ખાના સફાઈ - 2 (પ્લેટફોર્મ )',
    personIds: [P.Harsh],
  },
  { id: 'wt_freeze2', title: 'ફ્રીઝ સફાઈ', personIds: [P.Darshak] },
  {
    id: 'wt_basin',
    title: 'બેસીન અને ખાના સફાઈ',
    personIds: [],
  },
]

export function createDefaultSevaConfig() {
  const assignments = {}
  for (const day of WEEK_DAYS) {
    assignments[day.id] = ASSIGNMENTS[day.id]
      ? { ...ASSIGNMENTS[day.id] }
      : emptyDaySlots()
  }

  return {
    title: 'શ્રી હરિ',
    weeklyColumnCount: 4,
    people: PEOPLE.map((p) => ({ ...p })),
    dailyGroups: DAILY_GROUPS.map((g) => ({ ...g })),
    weekDays: WEEK_DAYS.map((d) => ({ ...d })),
    loadColumns: [...LOAD_COLUMNS],
    weeklyTasks: WEEKLY_TASKS.map((t) => ({
      ...t,
      personIds: [...t.personIds],
    })),
    assignments,
    prefillRules: getDefaultPrefillRules(),
    updatedAt: new Date().toISOString(),
  }
}

export function emptySevaSlot() {
  return { personId: null, note: '' }
}
