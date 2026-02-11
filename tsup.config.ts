import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: true,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: ['src/remote.ts'],
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    external: ['express'],
  },
])
