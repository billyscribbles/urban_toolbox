/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// `yarn build:analyze` sets ANALYZE=true to emit dist/bundle-stats.html.
const analyze = process.env.ANALYZE === 'true'

export default defineConfig({
  plugins: [
    react(),
    analyze && visualizer({ filename: 'dist/bundle-stats.html', gzipSize: true }),
  ].filter(Boolean),
  preview: {
    host: '0.0.0.0',
    port: 4173,
    // Railway assigns a per-deploy *.up.railway.app subdomain plus any custom
    // domains. The leading dot makes Vite treat this as a wildcard, so we
    // don't have to update the config every deploy.
    allowedHosts: ['.up.railway.app'],
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  // Vitest runs the foundation "contract" suite — see src/test/.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
