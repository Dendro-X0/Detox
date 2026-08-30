import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AssistComparePanel from './dashboard/AssistComparePanel';
import AssistUnderstandPanel from './dashboard/AssistUnderstandPanel';
import AuthenticitySidePanel from './dashboard/AuthenticitySidePanel';
import { LocaleProvider } from './i18n/LocaleContext';
import './App.css';

function SidePanelRoot() {
    const view = new URLSearchParams(window.location.search).get('view');
    if (view === 'compare') {
        return <AssistComparePanel />;
    }
    if (view === 'understand') {
        return <AssistUnderstandPanel />;
    }
    return <AuthenticitySidePanel />;
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <LocaleProvider>
            <SidePanelRoot />
        </LocaleProvider>
    </StrictMode>
);
