import { Settings } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { ThemeSettingsSection } from '../components/settings/ThemeSettingsSection'
import { PushNotificationSettings } from '../components/settings/PushNotificationSettings'
import { BottomNavSettingsSection } from '../components/settings/BottomNavSettingsSection'
import { SettingsMobileView } from '../components/settings/mobile'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import {
  invalidateActiveNoticesCache,
  listActiveNotices,
} from '../services/noticeService'
import '../components/settings/settings.css'

export function SettingsPage() {
  const isMobile = useMediaQuery('(max-width: 899px)')

  useRegisterPullToRefresh(async () => {
    invalidateActiveNoticesCache()
    await listActiveNotices({ bypassCache: true }).catch(() => {})
  })

  if (isMobile) {
    return (
      <div className="page settings-page">
        <SettingsMobileView />
      </div>
    )
  }

  return (
    <div className="page settings-page">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Appearance and notification preferences for this device."
      />
      <div className="settings-sections">
        <ThemeSettingsSection />
        <BottomNavSettingsSection />
        <PushNotificationSettings />
      </div>
    </div>
  )
}
