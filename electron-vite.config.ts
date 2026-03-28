import { resolve } from 'path';
import { builtinModules } from 'module';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

/**
 * Plugin qui marque les modules natifs comme externes au stade resolveId.
 * electron-vite force ssr.noExternal=true, ce qui fait que Vite résout les
 * imports en chemins absolus avant que Rollup vérifie rollupOptions.external.
 * En interceptant dans resolveId, on stoppe le traitement AVANT la résolution.
 */
function nativeExternalPlugin(modules: string[]): Plugin {
  return {
    name: 'native-external',
    enforce: 'pre',
    resolveId(id: string) {
      // Correspondance exacte (bare specifier)
      if (modules.includes(id)) {
        return { id, external: true };
      }
      // Correspondance sur chemin absolu (ex: C:\...\node_modules\better-sqlite3\...)
      for (const mod of modules) {
        if (id.includes(`/${mod}/`) || id.includes(`\\${mod}\\`) || id.includes(`/${mod}`) || id.endsWith(`\\${mod}`)) {
          return { id: mod, external: true };
        }
      }
      return null;
    },
  };
}

const NATIVE_MODULES = ['better-sqlite3'];

export default defineConfig({
  main: {
    plugins: [nativeExternalPlugin(NATIVE_MODULES)],
    build: {
      rollupOptions: {
        input: { main: resolve('src/main/main.ts') },
        external: [
          'electron',
          /^electron\/.+/,
          'better-sqlite3',
          ...builtinModules,
          ...builtinModules.map(m => `node:${m}`),
        ],
        output: { format: 'cjs', entryFileNames: '[name].js' },
      },
      commonjsOptions: {
        ignoreDynamicRequires: true,
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve('src/preload/index.ts') },
        external: [
          'electron',
          /^electron\/.+/,
          ...builtinModules,
          ...builtinModules.map(m => `node:${m}`),
        ],
        output: { format: 'cjs', entryFileNames: '[name].js' },
      },
    },
  },
  renderer: {
    resolve: { alias: { '@renderer': resolve('src/renderer') } },
    plugins: [react()],
  },
});
