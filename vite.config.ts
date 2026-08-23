import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

// Fix for ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isCloudRun = !!(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB);

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(!isCloudRun ? [
        electron([
          {
            // Main-Process entry point of the Electron App.
            entry: path.resolve(__dirname, 'electron/main.ts'),
            vite: {
              build: {
                minify: false,
                outDir: 'dist-electron',
                lib: {
                  entry: path.resolve(__dirname, 'electron/main.ts'),
                  formats: ['cjs'],
                  fileName: () => 'main.cjs',
                },
                rollupOptions: {
                  external: ['electron', 'better-sqlite3'],
                },
              },
            },
          },
          {
            entry: path.resolve(__dirname, 'electron/preload.ts'),
            vite: {
              build: {
                minify: false,
                outDir: 'dist-electron',
                lib: {
                  entry: path.resolve(__dirname, 'electron/preload.ts'),
                  formats: ['cjs'],
                  fileName: () => 'preload.cjs',
                },
                rollupOptions: {
                  external: ['electron'],
                },
              },
            },
          },
        ]),
        renderer(),
      ] : []),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
