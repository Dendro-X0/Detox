import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { resolve } from 'path'
import fs from 'fs'

// Firefox MV2 build config (without CRXJS since it only supports MV3)
// Uses a custom plugin to copy manifest and handle Firefox-specific assets
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    {
      name: 'firefox-manifest',
      generateBundle() {
        // Copy Firefox MV2 manifest to output
        const manifestPath = resolve(__dirname, 'manifest-firefox.json')
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: JSON.stringify(manifest, null, 2)
        })
      }
    }
  ],
  build: {
    outDir: 'dist-firefox',
    rollupOptions: {
      input: {
        index: 'index.html',
        background: 'src/background-firefox.ts',
        content: 'src/content.ts',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'src/background-firefox.js'
          if (chunkInfo.name === 'content') return 'src/content.js'
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
  },
})
