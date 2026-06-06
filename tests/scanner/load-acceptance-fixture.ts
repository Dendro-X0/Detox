import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { hydrateFixtureShadowRoots } from './load-fixture';

const ACCEPTANCE_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../fixtures/acceptance'
);

export function loadAcceptanceFixture(filename: string): Document {
    const filePath = path.join(ACCEPTANCE_DIR, filename);
    const html = fs.readFileSync(filePath, 'utf-8');
    const window = new Window();
    window.document.write(html);
    hydrateFixtureShadowRoots(window.document);
    return window.document;
}

export const ACCEPTANCE_FIXTURE_DIR = ACCEPTANCE_DIR;
