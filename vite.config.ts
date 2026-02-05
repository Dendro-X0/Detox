import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import manifest from './src/manifest.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        offscreen: 'offscreen.html',
        'backend-benchmark': 'backend-benchmark.html',
      },
    },
  },
})
