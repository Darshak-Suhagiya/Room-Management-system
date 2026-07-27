import { useMediaQuery } from '../../hooks/useMediaQuery'
import { NotificationInboxPanel } from './NotificationInboxPanel'
import { NotificationInboxSheet } from './NotificationInboxSheet'

export function NotificationInbox() {
  const isMobile = useMediaQuery('(max-width: 899px)')
  return isMobile ? <NotificationInboxSheet /> : <NotificationInboxPanel />
}
