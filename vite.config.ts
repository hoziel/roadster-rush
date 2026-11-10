import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: { host: true },
  test: { include: ['tests/**/*.test.ts'] },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      // Offline after the first visit: precache the whole (small) build.
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,jpg,ttf,woff2,glb,ogg,mp3,m4a,json}'] },
      manifest: {
        name: 'Roadster Rush',
        short_name: 'Roadster',
        description: 'Drive a roadster through sunset Austin.',
        theme_color: '#3b1f5c',
        background_color: '#3b1f5c',
        display: 'fullscreen',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        // Codex's hovering-roadster icon (art/mockups/05-app-icon).
        icons: [
          { src: 'icons/app-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/app-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
