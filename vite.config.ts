/*
========
Configuração de build e testes automatizados da biblioteca v-tutorial (vite.config.ts).
Configura o empacotamento em modo biblioteca (ES e UMD), geração automática de declarações TypeScript (.d.ts),
resolução de alias '@', compilação de SCSS e o ambiente happy-dom enxuto para o Vitest.
========
*/
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    dedupe: ['vue'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts', 'src/**/*.vue'],
      outDir: 'dist',
    }),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    silent: true,
    reporters: ['basic'],
  },
  build: {
    cssCodeSplit: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VTutorial',
      fileName: 'v-tutorial',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
        exports: 'named',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'style.css'
          }
          return assetInfo.name || 'assets/[name][extname]'
        },
      },
    },
  },
})