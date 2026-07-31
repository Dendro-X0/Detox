import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import './theme/theme.css'
import { initThemeOnDocument } from './theme/apply-theme'
import { LocaleProvider } from './i18n/LocaleContext'
import { ThemeProvider } from './theme/ThemeProvider'
import PopupApp from './PopupApp.tsx'

document.documentElement.classList.add('sl-popup')
initThemeOnDocument()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <PopupApp />
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>,
)
