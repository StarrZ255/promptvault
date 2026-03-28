import { resolve } from 'path';
import { builtinModules } from 'module';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Externalise TOUT ce qui n'est pas un import relatif/absolu (= tous les node_modules + built-ins)
const externalAll = (id: string) =>
  builtinModules.includes(id) ||
  builtinModules.includes(id.replace('node:', '')) ||
  id.startsWith('electron') ||
  (!id.startsWith('.') && !id.startsWith('/') && !id.startsWith('C:\\') && !id.startsWith('C:/'));

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve('src/main/main.ts'),
        formats: ['cjs'],
      },
      rollupOptions: {
        external: externalAll,
        output: {
          entryFileNames: 'main.js',
        },
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve('src/preload/index.ts'),
        formats: ['cjs'],
      },
      rollupOptions: {
        external: externalAll,
        output: {
          entryFileNames: 'index.js',
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
      },
    },
    plugins: [react()],
  },
});
