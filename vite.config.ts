import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// `npm run build:web` (mode "artifact") makes a single self-contained page for
// hosting: no service worker, every chunk inlined. See scripts/inline.mjs.
export default defineConfig(({ mode }) => mode === 'artifact' ? {
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist-web',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
} : {
  // BASE=/Demos/ for GitHub Pages (npm run build:pages); '/' everywhere else.
  base: process.env.BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Demo Vault',
        short_name: 'Demos',
        description: 'Your private demo vault and direct line to house music labels.',
        theme_color: '#050505',
        background_color: '#050505',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the app shell only; audio streams straight from storage.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
})
