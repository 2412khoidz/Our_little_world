import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { devLanServerPlugin } from './scripts/devLanServerPlugin.mjs';

export default defineConfig({
  plugins: [
    react(),
    devLanServerPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'icons/favicon-32x32.png',
        'icons/apple-touch-icon-180x180.png',
        'assets/manifest.json',
      ],
      manifest: {
        name: 'Our Little World',
        short_name: 'Little World',
        description: 'Ngôi nhà nhỏ pixel art riêng tư cho hai người',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#2d2226',
        background_color: '#2d2226',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,svg,webmanifest}'],
        globIgnores: ['spike/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/spike\//, /^\/api\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
