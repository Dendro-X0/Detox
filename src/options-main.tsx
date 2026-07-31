import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './dashboard/dashboard.css';
import './theme/theme.css';
import { initThemeOnDocument } from './theme/apply-theme';
import OptionsApp from './OptionsApp';

document.documentElement.classList.add('sl-app');
initThemeOnDocument();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>
);
