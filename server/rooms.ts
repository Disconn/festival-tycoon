import { WebSocketServer, type WebSocket } from 'ws'
import type { IncomingMessage } from 'node:http'
import { networkInterfaces } from 'node:os'
import type { ClientMessage, NetPlayer, ServerMessage } from '../src/net/protocol.ts'

type RoomClient = {
  id: string
  name: string
  role: 'host' | 'client'
  socket: WebSocket
}

type Room = {
  code: string
  hostId: string
  clients: Map<string, RoomClient>
}

const rooms = new Map<string, Room>()

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

function playersOf(room: Room): NetPlayer[] {
  return [...room.clients.values()].map((client) => ({
    id: client.id,
    name: client.name,
    role: client.role,
  }))
}

function broadcast(room: Room, message: ServerMessage, except?: string): void {
  room.clients.forEach((client) => {
    if (client.id === except) return
    send(client.socket, message)
  })
}

function createCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return rooms.has(code) ? createCode() : code
}

function closeRoom(room: Room, message: string): void {
  broadcast(room, { t: 'closed', message })
  room.clients.forEach((client) => client.socket.close())
  rooms.delete(room.code)
}

export function localJoinHost(port: number): string {
  const nets = networkInterfaces()
  for (const list of Object.values(nets)) {
    for (const item of list ?? []) {
      if (item.family === 'IPv4' && !item.internal) {
        return `${item.address}:${port}`
      }
    }
  }
  return `localhost:${port}`
}

export function attachMultiplayer(
  wss: WebSocketServer,
  getJoinHost: () => string,
): void {
  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    let joined: { room: Room; id: string } | null = null

    socket.on('message', (raw) => {
      let message: ClientMessage
      try {
        message = JSON.parse(String(raw)) as ClientMessage
      } catch {
        send(socket, { t: 'error', message: 'Ungültige Nachricht' })
        return
      }
      if (!message || typeof message !== 'object' || typeof message.t !== 'string') {
        send(socket, { t: 'error', message: 'Ungültige Nachricht' })
        return
      }

      if (message.t === 'host') {
        if (joined) return
        const code = createCode()
        const id = `player-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
        const room: Room = { code, hostId: id, clients: new Map() }
        const client: RoomClient = {
          id,
          name: message.name || 'Host',
          role: 'host',
          socket,
        }
        room.clients.set(id, client)
        rooms.set(code, room)
        joined = { room, id }
        send(socket, {
          t: 'hosted',
          code,
          playerId: id,
          joinUrl: `${getJoinHost()}  ·  Code ${code}`,
          players: playersOf(room),
        })
        return
      }

      if (message.t === 'join') {
        if (joined) return
        const room = rooms.get(message.code.trim().toUpperCase())
        if (!room) {
          send(socket, { t: 'error', message: 'Kein Spiel mit diesem Code' })
          return
        }
        const id = `player-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`
        const client: RoomClient = {
          id,
          name: message.name || 'Gast',
          role: 'client',
          socket,
        }
        room.clients.set(id, client)
        joined = { room, id }
        send(socket, {
          t: 'joined',
          code: room.code,
          playerId: id,
          role: 'client',
          players: playersOf(room),
        })
        broadcast(room, { t: 'players', players: playersOf(room) }, id)
        return
      }

      if (!joined) {
        send(socket, { t: 'error', message: 'Zuerst einem Spiel beitreten' })
        return
      }

      if (message.t === 'resync') {
        const host = joined.room.clients.get(joined.room.hostId)
        if (host) send(host.socket, { t: 'resync' })
        return
      }

      if (message.t === 'command') {
        const host = joined.room.clients.get(joined.room.hostId)
        if (!host) {
          send(socket, { t: 'error', message: 'Host ist nicht verbunden' })
          return
        }
        if (joined.id === joined.room.hostId) return
        send(host.socket, { t: 'command', cmd: message.cmd, from: joined.id })
        return
      }

      if (message.t === 'commandResult' && joined.id === joined.room.hostId) {
        const target = joined.room.clients.get(message.to)
        if (target) send(target.socket, {
          t: 'commandResult',
          commandId: message.commandId,
          result: message.result,
        })
        return
      }

      if (
        joined.id === joined.room.hostId &&
        (message.t === 'state' || message.t === 'world' ||
          message.t === 'sim' ||
          message.t === 'result' ||
          message.t === 'apply' ||
          message.t === 'turn' ||
          message.t === 'sync')
      ) {
        broadcast(joined.room, message, joined.id)
      }
    })

    socket.on('close', () => {
      if (!joined) return
      const { room, id } = joined
      room.clients.delete(id)
      if (id === room.hostId) {
        closeRoom(room, 'Der Host hat das Spiel verlassen')
        return
      }
      if (room.clients.size === 0) {
        rooms.delete(room.code)
        return
      }
      broadcast(room, { t: 'players', players: playersOf(room) })
    })

    void request
  })
}
