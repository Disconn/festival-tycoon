import type { Plugin, ViteDevServer } from 'vite'
import { WebSocketServer } from 'ws'
import { attachMultiplayer, localJoinHost } from './rooms.ts'

function bindWebSocket(
  server: ViteDevServer,
  port: number,
): void {
  const httpServer = server.httpServer
  if (!httpServer) return
  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: { threshold: 1024, zlibDeflateOptions: { level: 1 } },
  })
  attachMultiplayer(wss, () => localJoinHost(port))
  httpServer.on('upgrade', (request, socket, head) => {
    const path = request.url?.split('?')[0]
    if (path !== '/ws') return
    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit('connection', websocket, request)
    })
  })
}

export function festivalMultiplayer(): Plugin {
  return {
    name: 'festival-multiplayer',
    configureServer(server) {
      bindWebSocket(server, server.config.server.port ?? 5173)
    },
    configurePreviewServer(server) {
      bindWebSocket(
        server as unknown as ViteDevServer,
        server.config.preview.port ?? 4173,
      )
    },
  }
}
