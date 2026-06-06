import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import { LocaleProvider } from './i18n/LocaleContext'
import PopupApp from './PopupApp.tsx'

document.documentElement.classList.add('sl-popup')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LocaleProvider>
      <PopupApp />
    </LocaleProvider>
  </StrictMode>,
)
