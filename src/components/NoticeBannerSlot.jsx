import { NoticeBanner } from './NoticeBanner'
import { useActiveNotices } from '../hooks/useActiveNotices'
import { NOTICE_PAGES } from '../config/constants'

/** Live sticky notices for a page surface. */
export function NoticeBannerSlot({ page }) {
  const { notices, removeNotice } = useActiveNotices(page)
  if (!notices.length) return null
  return <NoticeBanner notices={notices} onNoticeRead={removeNotice} sticky />
}

export { NOTICE_PAGES }
