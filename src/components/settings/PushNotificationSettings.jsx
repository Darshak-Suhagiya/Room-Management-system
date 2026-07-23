import { PushPermissionCard } from '../PushPermissionCard'

export function PushNotificationSettings() {
  return (
    <section className="settings-section">
      <h3 className="settings-section-title">Notifications</h3>
      <p className="settings-section-desc muted">
        Enable push reminders for menus and votes on this device.
      </p>
      <PushPermissionCard variant="settings" />
    </section>
  )
}
