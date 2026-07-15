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
        // Function form (not the object form) so it's robust to Yarn PnP's
        // virtual module paths. Order matters: framer-motion is matched first
        // and isolated in its own chunk (only the lazy drawers import it), then
        // everything React — including react/jsx-runtime — is pinned to vendor.
        // If the JSX runtime were left to land in the motion chunk, the entry
        // would statically import it and drag framer-motion onto the home
        // route's critical path, hurting LCP even though nothing above the fold
        // animates.
        manualChunks(id) {
          if (id.includes('framer-motion')) return 'motion'
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/') ||
            id.includes('react-npm') ||
            id.includes('react-dom-npm') ||
            id.includes('react-router')
          ) {
            return 'vendor'
          }
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
