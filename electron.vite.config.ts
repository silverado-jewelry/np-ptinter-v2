import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const sharedAlias = { '@shared': resolve('shared') }

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    build: { target: 'node16' }
  },
  preload: {
    resolve: { alias: sharedAlias },
    build: { target: 'node16' }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        ...sharedAlias
      }
    },
    build: { target: 'chrome108' },
    plugins: [react()]
  }
})
