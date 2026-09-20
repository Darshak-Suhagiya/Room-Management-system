import { BlessingHero } from '../components/darshan'

export function SetupPage() {
  return (
    <div className="setup-page pt-safe pb-safe">
      <BlessingHero
        artKey="login"
        size="tall"
        title="App unavailable"
        subtitle="This app is not configured yet."
      />
      <div className="setup-card">
        <h1>App unavailable</h1>
        <p>
          This app is not configured yet. Please contact an administrator.
        </p>
      </div>
    </div>
  )
}
