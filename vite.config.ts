import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'icons/*.png'],
    manifest: {
      id: '/', name: 'Parking OS', short_name: 'Parking OS',
      description: 'Tu espacio, a un toque. Estacionamiento inteligente.',
      lang: 'es', start_url: '/', scope: '/', display: 'standalone',
      background_color: '#151619', theme_color: '#151619',
      icons: [
        { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      navigateFallbackDenylist: [/^\/api\//, /^\/socket.io/],
      // Nunca guardar disponibilidad ni datos financieros de la API en caché.
      runtimeCaching: [],
    },
  })],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: { manualChunks: { motion: ['motion/react'], realtime: ['socket.io-client'], validation: ['zod'] } },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
