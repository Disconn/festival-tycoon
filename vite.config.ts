import { defineConfig } from 'vite'
import { festivalMultiplayer } from './server/wsPlugin.ts'
import { festivalVersion } from './server/versionPlugin.ts'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const buildId = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [festivalMultiplayer(), festivalVersion(version, buildId)],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
