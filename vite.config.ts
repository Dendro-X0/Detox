import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import baseManifest from './src/manifest.json'
import { applyModProfileToManifest, modProfilePlugin, resolveModBuildProfile } from './vite.mod-profile'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const profile = resolveModBuildProfile({ ...process.env, ...env } as Record<string, string>)
  const manifest = applyModProfileToManifest(baseManifest, profile)

  const rollupInput: Record<string, string> = {
    index: 'index.html',
    offscreen: 'offscreen.html',
    options: 'options.html',
    sidepanel: 'sidepanel.html',
  };
  if (profile === 'full') {
    rollupInput['backend-benchmark'] = 'backend-benchmark.html';
  }

  return {
    plugins: [
      react(),
      wasm(),
      topLevelAwait(),
      crx({ manifest: manifest as typeof baseManifest }),
      modProfilePlugin(profile, 'dist'),
    ],
    build: {
      rollupOptions: {
        input: rollupInput,
      },
    },
  }
})
