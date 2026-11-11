import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the frontend calls /api/... and Vite forwards it to the backend,
// so no CORS setup is needed. VITE_API_PROXY_TARGET chooses which backend server to use.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000';
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
      },
    },
  };
});
