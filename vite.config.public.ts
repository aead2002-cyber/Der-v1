import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// Standalone Vite config for the public report page.
// Runs on its own port and builds only the report entry — so the public form
// can be served independently of the admin system.

// Force every HTML navigation to resolve to report.html. This prevents access
// to login/admin routes (e.g. /login, /policies) through the public-server port
// during both `dev:public` and `preview:public`.
const reportOnlyPlugin: Plugin = {
  name: 'der3-report-only',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url || '/';
      // Pass through static assets and Vite internals untouched.
      if (
        url.startsWith('/@') ||
        url.startsWith('/src/') ||
        url.startsWith('/node_modules/') ||
        url.startsWith('/__vite') ||
        /\.(js|ts|tsx|jsx|css|map|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|json)(\?|$)/i.test(url)
      ) {
        return next();
      }
      // Any other page request → serve the report form.
      req.url = '/report.html';
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url || '/';
      if (/\.(js|css|map|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf|json)(\?|$)/i.test(url)) {
        return next();
      }
      req.url = '/report.html';
      next();
    });
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), reportOnlyPlugin],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3100,
      host: true,
      allowedHosts: true,
      open: '/report.html',
    },
    build: {
      outDir: 'dist-public',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          report: path.resolve(__dirname, 'report.html'),
        },
      },
    },
  };
});
