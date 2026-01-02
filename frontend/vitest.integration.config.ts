import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'integration',
    environment: 'happy-dom',
    setupFiles: ['./src/testing/setup/integration-setup.tsx'],
    include: ['src/testing/integration/**/*.test.{ts,tsx}'],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
