import { Settings } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { MobilePageHeader } from '../components/mobile'
import { ThemeSettingsSection } from '../components/settings/ThemeSettingsSection'
import { PushNotificationSettings } from '../components/settings/PushNotificationSettings'
import { BottomNavSettingsSection } from '../components/settings/BottomNavSettingsSection'
import '../components/settings/settings.css'

export function SettingsPage() {
  const settingsSections = (
    <div className="settings-sections">
      <ThemeSettingsSection />
      <BottomNavSettingsSection />
      <PushNotificationSettings />
    </div>
  )

  return (
    <div className="page settings-page">
      <div className="layout-desktop">
        <PageHeader
          icon={Settings}
          title="Settings"
          description="Appearance and notification preferences for this device."
        />
        {settingsSections}
      </div>

      <div className="layout-mobile settings-mobile mobile-section-gap">
        <MobilePageHeader
          icon={Settings}
          title="Settings"
          description="Appearance and notifications for this device."
        />
        {settingsSections}
      </div>
    </div>
  )
}
