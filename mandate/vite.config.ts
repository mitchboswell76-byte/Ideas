/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the build works from any path (Artifact hosting, file server, sub-folder).
export default defineConfig({
  base: './',
  plugins: [react()],
  // The lazy map chunks are mostly bundled data (UK boundaries ~565 KB, ~175 KB gzip).
  build: { chunkSizeWarningLimit: 700 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
