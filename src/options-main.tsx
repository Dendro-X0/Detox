import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './dashboard/dashboard.css';
import OptionsApp from './OptionsApp';

document.documentElement.classList.add('sl-app');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>
);
