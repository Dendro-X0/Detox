import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyModProfileToManifest } from '../../vite.mod-profile';

const baseFirefoxManifest = JSON.parse(
    readFileSync(join(process.cwd(), 'manifest-firefox.json'), 'utf8')
);

describe('Firefox build QA', () => {
    it('core profile strips Hugging Face permissions from Firefox MV2 manifest', () => {
        const manifest = applyModProfileToManifest(baseFirefoxManifest, 'core');
        const permissions = manifest.permissions as readonly string[];
        expect(permissions.some((p) => p.includes('huggingface'))).toBe(false);
        expect(permissions.some((p) => p.includes('hf.co'))).toBe(false);
    });

    it('core profile removes model-pack and ort web accessible resources', () => {
        const manifest = applyModProfileToManifest(baseFirefoxManifest, 'core');
        const resources = manifest.web_accessible_resources as readonly string[];
        expect(resources.some((r) => r.includes('model-packs'))).toBe(false);
        expect(resources.some((r) => r.includes('ort'))).toBe(false);
    });

    it('Firefox source manifest includes AMO gecko id and sidebar', () => {
        expect(baseFirefoxManifest.browser_specific_settings?.gecko?.id).toBeTruthy();
        expect(baseFirefoxManifest.sidebar_action?.default_panel).toBe('sidepanel.html');
        expect(baseFirefoxManifest.browser_action?.default_popup).toBe('index.html');
    });

    it('built Firefox bundle contains required entry points', ({ skip }) => {
        const distDir = join(process.cwd(), 'dist-firefox');
        const manifestPath = join(distDir, 'manifest.json');
        let manifest: {
            background?: { scripts?: string[] };
            content_scripts?: { js?: string[] }[];
        };

        try {
            manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        } catch {
            // Built after G2b in release:preflight; G5a re-runs this suite post-build.
            skip();
            return;
        }

        const bg = manifest.background?.scripts?.[0];
        const content = manifest.content_scripts?.[0]?.js?.[0];
        expect(bg).toBe('src/background-firefox.js');
        expect(content).toBe('src/content.js');
        expect(() => readFileSync(join(distDir, bg!))).not.toThrow();
        expect(() => readFileSync(join(distDir, content!))).not.toThrow();
    });
});
