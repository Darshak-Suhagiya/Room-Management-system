import { useState } from 'react'
import {
  Bell,
  LayoutGrid,
  LogOut,
  Palette,
  Settings,
} from 'lucide-react'
import { MobilePageHeader, MobileNestedScreen } from '../../mobile'
import { useAuth } from '../../../contexts/AuthContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useBottomNavPreferences } from '../../../contexts/BottomNavPreferencesContext'
import { usePushNotifications } from '../../../hooks/usePushNotifications'
import { getRoleLabel, getUserInitials } from '../../../utils/userDisplay'
import { ThemeSettingsSection } from '../ThemeSettingsSection'
import { PushNotificationSettings } from '../PushNotificationSettings'
import { BottomNavSettingsSection } from '../BottomNavSettingsSection'
import { SettingsGroup, SettingsRow } from './SettingsRow'
import './settings-mobile.css'

function pushStatusLabel(status) {
  switch (status) {
    case 'enabled':
      return 'On this device'
    case 'denied':
      return 'Blocked in browser'
    case 'iosInstall':
      return 'Add to Home Screen'
    case 'unsupported':
      return 'Not supported'
    case 'checking':
      return 'Checking…'
    default:
      return 'Off on this device'
  }
}

export function SettingsMobileView() {
  const { profile, logout } = useAuth()
  const { theme, appearance } = useTheme()
  const { isCustomizable, tabIds } = useBottomNavPreferences()
  const { status } = usePushNotifications()
  const [screen, setScreen] = useState(null)

  const initials = getUserInitials(profile?.displayName, profile?.email)
  const roleLabel = getRoleLabel(profile)
  const appearanceMode = appearance === 'dark' ? 'Dark' : 'Light'
  const navSubtitle = isCustomizable
    ? `${tabIds.length} tab${tabIds.length === 1 ? '' : 's'}`
    : 'Add to Home Screen to customize tabs'

  return (
    <div className="settings-mobile-view admin-mobile-page mobile-section-gap">
      <MobilePageHeader
        icon={Settings}
        title="Settings"
        description="Appearance and notifications for this device."
      />

      <SettingsGroup>
        <div className="settings-mobile-account">
          <span className="settings-mobile-avatar" aria-hidden>
            {initials}
          </span>
          <span className="settings-mobile-account-text">
            <strong>{profile?.displayName || 'User'}</strong>
            {roleLabel ? <span className="muted">{roleLabel}</span> : null}
          </span>
        </div>
        <button type="button" className="settings-mobile-signout" onClick={() => logout()}>
          <LogOut size={18} aria-hidden />
          Sign out
        </button>
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <SettingsRow
          icon={Palette}
          label="Appearance"
          subtitle={`${theme.name} · ${appearanceMode}`}
          onClick={() => setScreen('appearance')}
        />
        <SettingsRow
          icon={Bell}
          label="Notifications"
          subtitle={pushStatusLabel(status)}
          onClick={() => setScreen('notifications')}
        />
        <SettingsRow
          icon={LayoutGrid}
          label="Bottom navigation"
          subtitle={navSubtitle}
          onClick={() => setScreen('nav')}
        />
      </SettingsGroup>

      <MobileNestedScreen
        open={screen === 'appearance'}
        onClose={() => setScreen(null)}
        title="Appearance"
        className="settings-mobile-nested"
      >
        <ThemeSettingsSection />
      </MobileNestedScreen>

      <MobileNestedScreen
        open={screen === 'notifications'}
        onClose={() => setScreen(null)}
        title="Notifications"
        className="settings-mobile-nested"
      >
        <PushNotificationSettings />
      </MobileNestedScreen>

      <MobileNestedScreen
        open={screen === 'nav'}
        onClose={() => setScreen(null)}
        title="Bottom navigation"
        className="settings-mobile-nested"
      >
        {isCustomizable ? (
          <BottomNavSettingsSection />
        ) : (
          <p className="muted settings-mobile-nav-hint">
            Add this app to your Home Screen, then open it from there to choose
            which tabs appear in the bottom bar.
          </p>
        )}
      </MobileNestedScreen>
    </div>
  )
}
