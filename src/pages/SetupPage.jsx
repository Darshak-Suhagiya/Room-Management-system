export function SetupPage() {
  return (
    <div className="setup-page">
      <div className="setup-card">
        <h1>Firebase setup required</h1>
        <p>
          Copy <code>.env.example</code> to <code>.env</code> and add your
          Firebase web app config from the Firebase Console.
        </p>
        <ol>
          <li>
            Create a project at{' '}
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noreferrer"
            >
              Firebase Console
            </a>
          </li>
          <li>Enable Authentication (Email/Password) and Firestore</li>
          <li>
            Register a web app and paste config into <code>.env</code>
          </li>
          <li>
            Run{' '}
            <code>
              npx firebase deploy --only firestore:rules
            </code>{' '}
            for security rules
          </li>
          <li>
            Set your user&apos;s <code>role</code> to <code>admin</code> in{' '}
            <code>users/{'{uid}'}</code>
          </li>
        </ol>
        <p className="muted">
          Your menu spreadsheet is the reference for item names — the app
          catalog already includes PRD items.
        </p>
      </div>
    </div>
  )
}
