import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  platform: 'neutral',
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: false,
  clean: true,
  outDir: 'dist',
  external: [],
  // Include WASM-related files
  noExternal: [],
  exports: {
    all: true,
  },
  skipNodeModulesBundle: false
})