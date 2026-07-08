import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyThemeSettings, getStoredAppearance } from './lib/applyTheme'
import './index.css'
import App from './App.jsx'

applyThemeSettings(null, getStoredAppearance())

try {
  const scale = localStorage.getItem('rm-app-ui-scale')
  if (scale && scale !== 'default') {
    document.documentElement.setAttribute('data-ui-scale', scale)
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
