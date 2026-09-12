import type { Plugin } from 'vite'
import type { ServerResponse } from 'node:http'

// Lets the client (updateNotice.ts) detect that a newer build has been
// deployed while the page is still open: dev/preview serve this from
// memory, the production build emits it as a plain dist/version.json file
// that server/serve.ts already serves with Cache-Control: no-cache (it
// only special-cases hashed asset filenames).
export function festivalVersion(version: string, buildId: string): Plugin {
  const payload = JSON.stringify({ version, buildId })
  const serve = (response: ServerResponse) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.setHeader('Cache-Control', 'no-cache')
    response.end(payload)
  }
  const middleware = (request: { url?: string }, response: ServerResponse, next: () => void) => {
    if (request.url?.split('?')[0] === '/version.json') serve(response)
    else next()
  }
  return {
    name: 'festival-version',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: payload })
    },
  }
}
