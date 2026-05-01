import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function bannerScannerPlugin() {
  const VIRTUAL_ID = 'virtual:banners';
  const RESOLVED_ID = '\0' + VIRTUAL_ID;
  return {
    name: 'banner-scanner',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      const publicDir = path.resolve(process.cwd(), 'public');
      const banners = fs.readdirSync(publicDir)
        .filter(f => f.startsWith('Banner') && /\.(png|jpe?g|webp)$/i.test(f))
        .sort()
        .map(f => ({ src: `/${f}`, alt: f.replace(/\.[^.]+$/, '') }));
      return `export default ${JSON.stringify(banners)};`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:8000';

  return {
    plugins: [react(), bannerScannerPlugin()],

    server: {
      port: 5173,
      strictPort: true,   // fail fast if 5173 is taken — prevents silent CORS port drift
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        // In dev, forward /api calls to the backend so CORS is never needed
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },

    preview: {
      port: 4173,
      strictPort: true,
    },

    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
    },
  };
});
