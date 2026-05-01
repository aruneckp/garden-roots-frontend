import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function bannerScannerPlugin() {
  const VIRTUAL_ID = 'virtual:banners';
  const RESOLVED_ID = '\0' + VIRTUAL_ID;
  const IMAGE_RE = /\.(png|jpe?g|webp|gif|avif|bmp)$/i;

  function scan() {
    const publicDir = path.resolve(process.cwd(), 'public');
    return fs.readdirSync(publicDir)
      .filter(f => f.startsWith('Banner') && IMAGE_RE.test(f))
      .sort()
      .map(f => ({ src: `/${f}`, alt: f.replace(/\.[^.]+$/, '') }));
  }

  return {
    name: 'banner-scanner',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return;
      return `export default ${JSON.stringify(scan())};`;
    },
    configureServer(server) {
      const publicDir = path.resolve(process.cwd(), 'public');
      const invalidate = (filePath) => {
        if (path.dirname(filePath) !== publicDir) return;
        const base = path.basename(filePath);
        if (!base.startsWith('Banner') || !IMAGE_RE.test(base)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.add(publicDir);
      server.watcher.on('add', invalidate);
      server.watcher.on('unlink', invalidate);
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
