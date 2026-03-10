import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:8000';

  return {
    plugins: [react()],

    server: {
      port: 5173,
      strictPort: true,   // fail fast if 5173 is taken — prevents silent CORS port drift
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
