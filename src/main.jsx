import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  applyThemeSettings,
  getStoredAppearance,
  getStoredThemeId,
} from './lib/applyTheme'
import { registerAppServiceWorker } from './lib/registerAppServiceWorker'
import './index.css'
import App from './App.jsx'

applyThemeSettings(getStoredThemeId(), getStoredAppearance())

try {
  const scale = localStorage.getItem('rm-app-ui-scale')
  if (scale && scale !== 'default') {
    document.documentElement.setAttribute('data-ui-scale', scale)
  }
} catch {
  /* ignore */
}

registerAppServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
