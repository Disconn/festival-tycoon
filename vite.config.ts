import { defineConfig } from 'vite'
import { festivalMultiplayer } from './server/wsPlugin.ts'

export default defineConfig({
  plugins: [festivalMultiplayer()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
