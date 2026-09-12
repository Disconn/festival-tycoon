import { defineConfig } from 'vite'
import { festivalMultiplayer } from './server/wsPlugin.ts'
import { festivalVersion } from './server/versionPlugin.ts'
import packageInfo from './package.json' with { type: 'json' }

// A tracked dependency also restarts Vite after version bumps; readFileSync did not.
const { version } = packageInfo
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
