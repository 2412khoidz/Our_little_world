import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { devLanServerPlugin } from './scripts/devLanServerPlugin.mjs';

import productionPublicFiles from './scripts/production-public-files.json' with { type: 'json' };

const privateArtDir = 'assets/private-unified';
const privateArtFiles = ['world.png', 'world-props.png', 'avatars.png', 'manifest.json', 'props-manifest.json', 'CREDITS.md']
  .map((file) => privateArtDir + '/' + file);

function approvedPublicAssets(privateBuild: boolean): Plugin {
  return {
    name: 'olw-approved-public-assets',
    apply: 'build',
    generateBundle() {
      for (const fileName of privateBuild ? [...productionPublicFiles, ...privateArtFiles] : productionPublicFiles) {
        this.emitFile({
          type: 'asset',
          fileName,
          source: readFileSync(resolve('public', fileName)),
        });
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const privateBuild = mode === 'private-art';
  const localAtlasReady = privateArtFiles.every((file) => existsSync(resolve('public', file)));
  if (privateBuild && !localAtlasReady) {
    throw new Error('Thiếu atlas riêng. Chạy npm run assets:atlas:private trước.');
  }

  return {
  define: {
    'import.meta.env.VITE_OLW_PRIVATE_ART': JSON.stringify(privateBuild || (command === 'serve' && localAtlasReady)),
  },
  build: { copyPublicDir: false },
  plugins: [
    react(),
    approvedPublicAssets(privateBuild),
    devLanServerPlugin({
      stateFilePath: process.env.OLW_DEV_LAN_STATE_FILE || undefined,
    }),
    VitePWA({
      registerType: 'prompt',
      // Chỉ thêm file không nằm trong workbox.globPatterns (json/png/svg/webmanifest).
      // Trùng includeAssets + glob gây duplicate URL/revision → add-to-cache-list-conflicting-entries.
      includeAssets: ['assets/unified/CREDITS.md'],
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
        globIgnores: [
          'spike/**',
          'assets/private-unified/**',
          // manifest.webmanifest + PWA icons được inject riêng; glob trùng gây conflicting-entries
          'manifest.webmanifest',
          'icons/pwa-192x192.png',
          'icons/pwa-512x512.png',
        ],
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
  };
});
