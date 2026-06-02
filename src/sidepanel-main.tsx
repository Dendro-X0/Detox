import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AuthenticitySidePanel from './dashboard/AuthenticitySidePanel';
import './App.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AuthenticitySidePanel />
    </StrictMode>
);
