/// <reference types="vitest" />
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    VitePWA({
    registerType: 'prompt',
    injectRegister: false,

    pwaAssets: {
      disabled: true,
      config: false,
    },

    manifest: {
      name: 'hason',
      short_name: 'hason',
      description: 'Your friendly neighbor json formatter.',
      theme_color: '#66C7F4',
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
  worker: {
    plugins: () => [
      wasm(),
      topLevelAwait()
    ]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      allow: ['../..']
    }
  },
  optimizeDeps: {
    exclude: ['./src/lib/jq-wasm/wasm/jq_1-8-1.js']
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Don't hash the jq files to avoid naming conflicts
          if (assetInfo.name && (assetInfo.name.includes('jq_1-8-1.js') || assetInfo.name.includes('jq_1-8-1.wasm'))) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    server: {
      deps: {}
    }
  }
})