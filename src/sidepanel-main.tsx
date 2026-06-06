import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AuthenticitySidePanel from './dashboard/AuthenticitySidePanel';
import { LocaleProvider } from './i18n/LocaleContext';
import './App.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <LocaleProvider>
            <AuthenticitySidePanel />
        </LocaleProvider>
    </StrictMode>
);
