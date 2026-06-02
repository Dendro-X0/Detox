import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import baseFirefoxManifest from './manifest-firefox.json'
import { applyModProfileToManifest, modProfilePlugin, resolveModBuildProfile } from './vite.mod-profile'

// Firefox MV2 build config (without CRXJS since it only supports MV3)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const profile = resolveModBuildProfile({ ...process.env, ...env } as Record<string, string>)
  const manifest = applyModProfileToManifest(baseFirefoxManifest, profile)

  return {
    plugins: [
      react(),
      wasm(),
      topLevelAwait(),
      modProfilePlugin(profile, 'dist-firefox'),
      {
        name: 'firefox-manifest',
        generateBundle() {
          this.emitFile({
            type: 'asset',
            fileName: 'manifest.json',
            source: JSON.stringify(manifest, null, 2),
          })
        },
      },
    ],
    build: {
      outDir: 'dist-firefox',
      rollupOptions: {
        input: {
          index: 'index.html',
          options: 'options.html',
          sidepanel: 'sidepanel.html',
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
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  }
})
