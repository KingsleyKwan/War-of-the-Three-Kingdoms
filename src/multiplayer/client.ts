/**
 * PartyKit client wrapper.
 * Connects to a room, sends ClientMsg, receives ServerMsg.
 * When PartyKit is not configured, falls back to local-only mode for UI testing.
 */

import type { ClientMsg, RoomState, ServerMsg } from './types'

export type RoomEventHandler = (msg: ServerMsg) => void

export interface MultiplayerClient {
  readonly clientId: string
  connect(roomId: string): Promise<void>
  disconnect(): void
  send(msg: ClientMsg): void
  onMessage(handler: RoomEventHandler): void
  /** true when talking to a real PartyKit server */
  readonly isOnline: boolean
}

/** Generate a stable-enough client id for this browser tab. */
export function localClientId(): string {
  const key = 'wtk_mp_client_id'
  try {
    let id = sessionStorage.getItem(key)
    if (!id) {
      id = 'c_' + Math.random().toString(36).slice(2, 10)
      sessionStorage.setItem(key, id)
    }
    return id
  } catch {
    return 'c_' + Math.random().toString(36).slice(2, 10)
  }
}

/**
 * PartyKit host, e.g. "my-project.username.partykit.dev"
 * Leave empty to run in local mock mode (no network).
 */
const PARTY_HOST = (import.meta as any).env?.VITE_PARTYKIT_HOST ?? ''

export function createMultiplayerClient(): MultiplayerClient {
  if (!PARTY_HOST) {
    return createLocalMockClient()
  }
  return createPartyClient(PARTY_HOST)
}

function createPartyClient(host: string): MultiplayerClient {
  const clientId = localClientId()
  let socket: WebSocket | null = null
  let handler: RoomEventHandler | null = null
  let roomId = ''

  return {
    clientId,
    isOnline: true,
    async connect(id: string) {
      roomId = id
      const url = `wss://${host}/parties/main/${encodeURIComponent(id)}?clientId=${encodeURIComponent(clientId)}`
      socket = new WebSocket(url)
      await new Promise<void>((resolve, reject) => {
        if (!socket) return reject(new Error('no socket'))
        socket.onopen = () => resolve()
        socket.onerror = () => reject(new Error('WebSocket failed'))
      })
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as ServerMsg
          handler?.(msg)
        } catch {
          /* ignore */
        }
      }
      socket.onclose = () => {
        handler?.({ type: 'error', message: '連線已中斷' })
      }
    },
    disconnect() {
      socket?.close()
      socket = null
    },
    send(msg: ClientMsg) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(msg))
      }
    },
    onMessage(h) {
      handler = h
    },
  }
}

/**
 * Local mock: no network. Lets us develop Lobby UI offline.
 * Host actions update an in-memory room; join/start are simulated for one tab only.
 */
function createLocalMockClient(): MultiplayerClient {
  const clientId = localClientId()
  let handler: RoomEventHandler | null = null
  let room: RoomState | null = null

  return {
    clientId,
    isOnline: false,
    async connect() {
      /* local: nothing to connect */
    },
    disconnect() {
      room = null
    },
    send(msg: ClientMsg) {
      if (msg.type === 'join' && room) {
        const empty = room.seats.find((s) => s.type === 'empty')
        if (!empty) {
          handler?.({ type: 'error', message: '房間已滿' })
          return
        }
        empty.type = 'human'
        empty.name = msg.name || '玩家'
        empty.clientId = clientId
        empty.ready = false
        handler?.({ type: 'room', room: { ...room, seats: [...room.seats] } })
        return
      }
      if (msg.type === 'leave') {
        room = null
        handler?.({ type: 'error', message: '已離開房間' })
        return
      }
      if (msg.type === 'host_room') {
        room = msg.room
        handler?.({ type: 'room', room: msg.room })
        return
      }
      if (msg.type === 'host_match') {
        if (room) room = { ...room, status: 'playing', match: msg.match }
        handler?.({ type: 'match', match: msg.match })
        return
      }
      if (msg.type === 'start' && room) {
        handler?.({ type: 'room', room: { ...room, status: 'playing' } })
      }
    },
    onMessage(h) {
      handler = h
    },
  }
}

/** Helper for the host to publish a brand-new room into the mock / real client. */
export function publishLocalRoom(client: MultiplayerClient, room: RoomState): void {
  void client
  void room
}
