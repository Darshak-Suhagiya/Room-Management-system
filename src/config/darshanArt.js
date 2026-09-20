const STAMP = '/darshan/stamp.jpg'
const SHEET = '/darshan/sheet.jpg'
const AASHIRVAD = '/darshan/aashirvad.jpg'

const entry = ({
  desktop,
  mobile = desktop,
  stamp = STAMP,
  position = 'center top',
  mobilePosition,
  stripPosition,
  sheet,
  sheetMobile,
}) => ({
  desktop,
  mobile,
  stamp,
  position,
  mobilePosition: mobilePosition ?? position,
  stripPosition: stripPosition ?? position,
  sheet: sheet ?? SHEET,
  sheetMobile: sheetMobile ?? sheet ?? SHEET,
})

export const DARSHAN_ART = {
  meals: entry({
    desktop: '/meals/hero-sinhasan.jpg',
    mobile: '/meals/hero-prasadam.jpg',
    stamp: '/meals/avatar-ghanshyam.jpg',
    position: 'center top',
    mobilePosition: 'center top',
    sheet: '/darshan/sheet-meals.jpg',
    stripPosition: 'center 30%',
  }),
  login: entry({ desktop: AASHIRVAD, position: 'center 6%' }),
  seva: entry({
    desktop: '/darshan/seva.jpg',
    position: 'center top',
    sheet: '/darshan/sheet-seva.jpg',
    stripPosition: 'center 8%',
  }),
  leave: entry({
    desktop: '/darshan/leave.jpg',
    mobile: '/darshan/leave-mobile.jpg',
    position: 'center 22%',
    mobilePosition: 'center 18%',
    sheet: '/darshan/sheet-leave.jpg',
    stripPosition: 'center 32%',
  }),
  stocks: entry({
    desktop: '/darshan/stocks.jpg',
    position: 'center 8%',
    mobilePosition: 'center 10%',
    sheet: '/darshan/sheet-stocks.jpg',
    stripPosition: 'center 26%',
  }),
  shopping: entry({
    desktop: '/darshan/shopping.jpg',
    mobile: '/darshan/shopping-mobile.jpg',
    position: 'center 8%',
    mobilePosition: 'center 16%',
    sheet: '/darshan/sheet-shopping.jpg',
    stripPosition: 'center 28%',
  }),
  finance: entry({
    desktop: '/darshan/finance.jpg',
    position: 'center top',
    mobilePosition: 'center 8%',
    sheet: '/darshan/sheet-finance.jpg',
    stripPosition: 'center top',
  }),
  votes: entry({
    desktop: '/darshan/votes.jpg',
    mobile: '/darshan/votes-mobile.jpg',
    position: 'center top',
    mobilePosition: 'center top',
    sheet: '/darshan/sheet-votes.jpg',
    stripPosition: 'center 16%',
  }),
  analytics: entry({
    desktop: '/darshan/analytics.jpg',
    mobile: '/darshan/analytics-mobile.jpg',
    position: 'center top',
    mobilePosition: 'center top',
    sheet: '/darshan/sheet-analytics.jpg',
    stripPosition: 'center 26%',
  }),
  notices: entry({
    desktop: '/darshan/notices.jpg',
    position: 'center top',
    sheet: '/darshan/sheet-notices.jpg',
    stripPosition: 'center 10%',
  }),
  inbox: entry({
    desktop: '/darshan/sheet-inbox.jpg',
    sheet: '/darshan/sheet-inbox.jpg',
    position: 'center 28%',
    stripPosition: 'center 28%',
  }),
  push: entry({
    desktop: '/darshan/hindolo.jpg',
    position: 'center 8%',
    mobilePosition: 'center 10%',
    sheet: '/darshan/sheet-push.jpg',
    stripPosition: 'center 10%',
  }),
  users: entry({
    desktop: '/darshan/users.jpg',
    position: 'center top',
    mobilePosition: 'center top',
    sheet: '/darshan/sheet-users.jpg',
    stripPosition: 'center 22%',
  }),
  planning: entry({
    desktop: '/darshan/planning.jpg',
    position: 'center 6%',
    mobilePosition: 'center top',
    sheet: '/darshan/sheet-planning.jpg',
    stripPosition: 'center 16%',
  }),
  catalog: entry({
    desktop: '/darshan/catalog.jpg',
    position: 'center 22%',
    mobilePosition: 'center 20%',
    sheet: '/darshan/sheet-catalog.jpg',
    stripPosition: 'center 26%',
  }),
  menus: entry({
    desktop: '/darshan/catalog.jpg',
    position: 'center 8%',
    mobilePosition: 'center top',
    sheet: '/darshan/sheet-catalog.jpg',
    stripPosition: 'center 26%',
  }),
  settings: entry({
    desktop: '/darshan/settings.jpg',
    position: 'center 38%',
    mobilePosition: 'center 36%',
    sheet: '/darshan/sheet-settings.jpg',
    stripPosition: 'center 30%',
  }),
  'seva-admin': entry({
    desktop: '/darshan/seva-admin.jpg',
    mobile: '/darshan/seva.jpg',
    position: 'center top',
    mobilePosition: 'center top',
    sheet: '/darshan/sheet-seva.jpg',
    stripPosition: 'center 8%',
  }),
  printable: entry({
    desktop: '/darshan/seva-admin.jpg',
    mobile: '/darshan/seva.jpg',
    stamp: STAMP,
    position: 'center top',
    mobilePosition: 'center top',
    sheet: '/darshan/sheet-seva.jpg',
    stripPosition: 'center 8%',
  }),
  sheet: entry({
    desktop: SHEET,
    sheet: SHEET,
    position: 'center 28%',
    stripPosition: 'center 28%',
  }),
  chrome: entry({ desktop: STAMP, stamp: STAMP, position: 'center 20%' }),
}

export function getDarshanArt(artKey = 'sheet') {
  return DARSHAN_ART[artKey] ?? DARSHAN_ART.sheet
}

export function getSheetSrc(art, isMobile = false) {
  const fallback = SHEET
  if (isMobile) return art?.sheetMobile || art?.sheet || fallback
  return art?.sheet || fallback
}
