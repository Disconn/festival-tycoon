import type { GameState } from '../game/GameState'
import { WorldUpdates } from './worldUpdates'
import { packWorld } from './codec'
import type {
  ClientMessage,
  GameCommand,
  NetPlayer,
  ServerMessage,
} from './protocol'

export type MultiplayerStatus = {
  mode: 'solo' | 'host' | 'client'
  code: string
  joinUrl: string
  playerId: string
  players: NetPlayer[]
  connected: boolean
  message: string
}

const EMPTY_STATUS: MultiplayerStatus = {
  mode: 'solo',
  code: '',
  joinUrl: '',
  playerId: '',
  players: [],
  connected: false,
  message: '',
}

export class MultiplayerSession {
  status: MultiplayerStatus = { ...EMPTY_STATUS }
  onStatus: (status: MultiplayerStatus) => void = () => {}
  onToast: (message: string, isError?: boolean) => void = () => {}
  private socket: WebSocket | null = null
  private game: GameState
  private updates = new WorldUpdates()
  private updateSeconds = 0
  private hasWorld = false

  constructor(game: GameState) {
    this.game = game
  }

  attach(game: GameState): void {
    this.unbindGame()
    this.game = game
    this.bindGame()
    if (this.status.mode === 'host') this.pushSync()
  }

  get socketUrl(): string {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${location.host}/ws`
  }

  host(name: string): void {
    this.connect({ t: 'host', name: name.trim() || 'Host' })
  }

  join(code: string, name: string): void {
    this.connect({
      t: 'join',
      code: code.trim().toUpperCase(),
      name: name.trim() || 'Gast',
    })
  }

  disconnect(): void {
    this.unbindGame()
    this.socket?.close()
    this.socket = null
    this.game.networkMode = 'solo'
    this.status = { ...EMPTY_STATUS, message: 'Getrennt' }
    this.onStatus(this.status)
  }

  tick(deltaSeconds: number): void {
    if (this.status.mode !== 'host' || this.status.players.length < 2) return
    this.updateSeconds += deltaSeconds
    if (this.updateSeconds < 0.2 || !this.canSend()) return
    // Do not queue stale snapshots on a slow uplink. Keep the delta baseline intact.
    if (this.socket!.bufferedAmount > 512 * 1024) return
    this.updateSeconds = 0
    this.socket!.send(this.updates.encode(packWorld(this.game.snapshot)))
  }

  private bindGame(): void {
    this.game.networkMode = this.status.mode
    this.game.commandOutbox =
      this.status.mode === 'client' ? (command) => this.sendCommand(command) : null
    if (this.status.mode === 'client') this.game.prepareClientLockstep()
    this.game.onTurnCommit = null
    this.game.onFestivalResult = this.status.mode === 'host' ? result => {
      this.onToast(result.message, !result.ok)
      this.send({ t: 'result', ...result })
    } : null
    this.game.onDesync =
      this.status.mode === 'client'
        ? (expected, actual) => {
            this.onToast(`Desync ${expected}≠${actual} – gleiche Welt neu`, true)
            this.send({ t: 'resync' })
          }
        : null
  }

  private unbindGame(): void {
    this.game.onFestivalResult = null
    this.game.commandOutbox = null
    this.game.onTurnCommit = null
    this.game.onDesync = null
    this.game.networkMode = 'solo'
  }

  private connect(hello: ClientMessage): void {
    this.disconnectQuiet()
    const socket = new WebSocket(this.socketUrl)
    this.socket = socket
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify(hello))
    })
    socket.addEventListener('message', (event) => {
      if (this.socket !== socket) return
      try {
        this.handleMessage(JSON.parse(String(event.data)) as ServerMessage)
      } catch {
        this.onToast('Ungültiger Weltabgleich – fordere neuen Zustand an', true)
        this.send({ t: 'resync' })
      }
    })
    socket.addEventListener('close', () => {
      if (this.socket === socket) {
        this.unbindGame()
        this.status = { ...EMPTY_STATUS, message: 'Verbindung beendet' }
        this.onStatus(this.status)
      }
    })
    socket.addEventListener('error', () => {
      this.onToast('Mehrspieler-Server nicht erreichbar', true)
    })
  }

  private disconnectQuiet(): void {
    this.unbindGame()
    const socket = this.socket
    this.socket = null
    socket?.close()
    this.hasWorld = false
    this.updateSeconds = 0
    this.updates.reset()
  }

  private sendCommand(command: GameCommand): void {
    this.send({ t: 'command', cmd: command })
  }

  private pushSync(): void {
    if (this.status.mode !== 'host' || !this.canSend()) return
    this.socket!.send(this.updates.encode(packWorld(this.game.snapshot), true))
    this.updateSeconds = 0
  }

  private canSend(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  private send(message: ClientMessage | ServerMessage): void {
    if (this.canSend()) this.socket?.send(JSON.stringify(message))
  }

  private becomeHost(status: MultiplayerStatus): void {
    this.status = status
    this.bindGame()
    this.pushSync()
    this.onStatus(this.status)
  }

  private handleMessage(message: ServerMessage): void {
    if (message.t === 'hosted') {
      this.becomeHost({
        mode: 'host',
        code: message.code,
        joinUrl: message.joinUrl,
        playerId: message.playerId,
        players: message.players,
        connected: true,
        message: `Raum ${message.code} läuft`,
      })
      return
    }
    if (message.t === 'joined') {
      this.status = {
        mode: message.role,
        code: message.code,
        joinUrl: '',
        playerId: message.playerId,
        players: message.players,
        connected: true,
        message:
          message.role === 'host'
            ? `Raum ${message.code} läuft`
            : `Verbunden mit ${message.code}`,
      }
      this.bindGame()
      if (message.role === 'host') this.pushSync()
      this.onStatus(this.status)
      return
    }
    if (message.t === 'players') {
      const previousCount = this.status.players.length
      this.status = { ...this.status, players: message.players }
      if (this.status.mode === 'host' && message.players.length > previousCount) {
        this.pushSync()
      }
      this.onStatus(this.status)
      return
    }
    if (message.t === 'command' && this.status.mode === 'host') {
      this.game.schedulePublicCommand(message.cmd)
      return
    }
    if (message.t === 'resync' && this.status.mode === 'host') {
      this.pushSync()
      return
    }
    if (message.t === 'turn' && this.status.mode === 'client') {
      this.game.receiveTurn(message)
      return
    }
    if (message.t === 'sync' && this.status.mode === 'client') {
      this.game.applyNetworkWorld(message.world)
      this.hasWorld = true
      return
    }
    if (message.t === 'state' && this.status.mode === 'client' && this.hasWorld) {
      this.game.applyNetworkUpdate(message.world, message.visitors, message.removed)
      return
    }
    if (message.t === 'result') {
      this.onToast(message.message, !message.ok)
      return
    }
    if (message.t === 'error') {
      this.onToast(message.message, true)
      return
    }
    if (message.t === 'closed') {
      this.onToast(message.message, true)
      this.disconnect()
    }
  }
}
