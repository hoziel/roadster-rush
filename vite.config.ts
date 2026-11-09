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
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ttf,woff2,glb,ogg,mp3,m4a,json}'] },
      pwaAssets: { config: true },
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
      },
    }),
  ],
});
