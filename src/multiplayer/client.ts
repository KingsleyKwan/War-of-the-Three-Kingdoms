/**
 * Multiplayer transport — PeerJS (WebRTC) by default.
 *
 * Uses the free public PeerJS cloud (0.peerjs.com) for signaling only.
 * Game data (room / match / actions) goes peer-to-peer; no self-hosted server.
 *
 * Role is decided by the first outbound message after connect(roomId):
 *   host_room → claim Peer ID as Host
 *   join      → connect to Host as Guest
 *
 * Fallback: set VITE_MP_OFFLINE=1 → local mock (single-tab UI preview).
 * Legacy: set VITE_PARTYKIT_HOST=xxx.partykit.dev → PartyKit WebSocket.
 */

import type { DataConnection } from 'peerjs'
import Peer from 'peerjs'
import type { ClientMsg, RoomState, ServerMsg } from './types'
import { firstEmptySeat } from './types'

export type RoomEventHandler = (msg: ServerMsg) => void

export interface MultiplayerClient {
  readonly clientId: string
  connect(roomId: string): Promise<void>
  disconnect(): void
  send(msg: ClientMsg): void
  onMessage(handler: RoomEventHandler): void
  /** true when using PeerJS or PartyKit (not pure local mock) */
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

const PARTY_HOST = (import.meta as any).env?.VITE_PARTYKIT_HOST ?? ''
const MP_OFFLINE = (import.meta as any).env?.VITE_MP_OFFLINE === '1'

const PEER_OPTS = {
  host: '0.peerjs.com',
  port: 443,
  path: '/',
  secure: true,
  debug: 0 as 0 | 1 | 2 | 3,
}

/** Namespace room codes on the shared public PeerJS cloud. */
function peerIdForRoom(roomId: string): string {
  return 'wtk-' + roomId.trim().toUpperCase()
}

export function createMultiplayerClient(): MultiplayerClient {
  if (MP_OFFLINE) return createLocalMockClient()
  if (PARTY_HOST) return createPartyClient(PARTY_HOST)
  return createPeerClient()
}

// ---------------------------------------------------------------------------
// PeerJS transport (default)
// ---------------------------------------------------------------------------

type WireJoin = { type: 'join'; name: string; clientId: string }
type WireMsg = ClientMsg | WireJoin

function createPeerClient(): MultiplayerClient {
  const clientId = localClientId()
  let handler: RoomEventHandler | null = null
  let peer: Peer | null = null
  let isHostMode = false
  let roleReady = false
  let room: RoomState | null = null
  let pendingRoomId = ''
  /** clientId → connection (host side) */
  const guestConns = new Map<string, DataConnection>()
  let hostConn: DataConnection | null = null
  const outbox: ClientMsg[] = []
  let destroyed = false
  /** Serialise role setup so concurrent send() calls wait */
  let setupChain: Promise<void> = Promise.resolve()

  function emit(msg: ServerMsg): void {
    if (!destroyed) handler?.(msg)
  }

  function broadcast(msg: ServerMsg): void {
    emit(msg)
    for (const conn of guestConns.values()) {
      if (conn.open) {
        try {
          conn.send(msg)
        } catch {
          /* ignore */
        }
      }
    }
  }

  function freeSeatByClientId(cid: string): void {
    if (!room) return
    const seat = room.seats.find((s) => s.clientId === cid)
    if (!seat) return
    seat.type = 'empty'
    seat.name = ''
    seat.clientId = undefined
    seat.ready = false
    room = { ...room, seats: [...room.seats] }
    broadcast({ type: 'room', room })
  }

  function onGuestConnection(conn: DataConnection): void {
    conn.on('data', (raw) => {
      const data = raw as WireMsg
      if (!data || typeof data !== 'object') return

      if (data.type === 'join') {
        if (!room || room.status !== 'lobby') {
          try {
            conn.send({ type: 'error', message: '無法加入（房間已開局或不存在）' })
          } catch {
            /* ignore */
          }
          return
        }
        const empty = firstEmptySeat(room.seats)
        if (!empty) {
          try {
            conn.send({ type: 'error', message: '房間已滿' })
          } catch {
            /* ignore */
          }
          return
        }
        const join = data as WireJoin
        const cid = join.clientId || conn.peer
        empty.type = 'human'
        empty.name = join.name || '玩家'
        empty.clientId = cid
        empty.ready = false
        guestConns.set(cid, conn)
        room = { ...room, seats: [...room.seats] }
        broadcast({ type: 'room', room })
        return
      }

      if (data.type === 'action') {
        const cid =
          [...guestConns.entries()].find(([, c]) => c === conn)?.[0] ?? conn.peer
        emit({ type: 'remote_action', clientId: cid, action: data.action })
        return
      }

      if (data.type === 'leave') {
        const cid =
          [...guestConns.entries()].find(([, c]) => c === conn)?.[0] ?? conn.peer
        guestConns.delete(cid)
        freeSeatByClientId(cid)
        return
      }

      if (data.type === 'ready' && room) {
        const cid =
          [...guestConns.entries()].find(([, c]) => c === conn)?.[0] ?? conn.peer
        const seat = room.seats.find((s) => s.clientId === cid)
        if (seat) {
          seat.ready = !!data.ready
          room = { ...room, seats: [...room.seats] }
          broadcast({ type: 'room', room })
        }
      }
    })
    conn.on('close', () => {
      const cid =
        [...guestConns.entries()].find(([, c]) => c === conn)?.[0] ?? conn.peer
      guestConns.delete(cid)
      freeSeatByClientId(cid)
    })
  }

  function dispatchSend(msg: ClientMsg): void {
    if (isHostMode) {
      if (msg.type === 'host_room') {
        room = msg.room
        broadcast({ type: 'room', room: msg.room })
        return
      }
      if (msg.type === 'host_match') {
        if (room) room = { ...room, status: 'playing', match: msg.match }
        broadcast({ type: 'match', match: msg.match })
        return
      }
      if (msg.type === 'leave') {
        destroyAll()
        emit({ type: 'error', message: '已離開房間' })
        return
      }
      return
    }

    // Guest → host
    if (!hostConn?.open) return
    if (msg.type === 'join') {
      const wire: WireJoin = { type: 'join', name: msg.name, clientId }
      hostConn.send(wire)
      return
    }
    hostConn.send(msg)
  }

  function destroyAll(): void {
    destroyed = true
    roleReady = false
    try {
      hostConn?.close()
    } catch {
      /* ignore */
    }
    hostConn = null
    for (const c of guestConns.values()) {
      try {
        c.close()
      } catch {
        /* ignore */
      }
    }
    guestConns.clear()
    try {
      peer?.destroy()
    } catch {
      /* ignore */
    }
    peer = null
    room = null
    pendingRoomId = ''
    outbox.length = 0
  }

  function waitPeerOpen(p: Peer): Promise<string> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Peer 連線逾時')), 12000)
      p.on('open', (id) => {
        clearTimeout(t)
        resolve(id)
      })
      p.on('error', (err) => {
        clearTimeout(t)
        reject(err)
      })
    })
  }

  function waitConnOpen(conn: DataConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('無法連上房主（逾時或房號錯誤）')), 12000)
      conn.on('open', () => {
        clearTimeout(t)
        resolve()
      })
      conn.on('error', (err) => {
        clearTimeout(t)
        reject(err)
      })
    })
  }

  /** First message decides role: host_room → Host, join → Guest. */
  async function ensureRole(firstMsg: ClientMsg): Promise<void> {
    if (roleReady) return
    if (!pendingRoomId) throw new Error('尚未 connect')

    const pid = peerIdForRoom(pendingRoomId)

    if (firstMsg.type === 'host_room' || firstMsg.type === 'host_match') {
      // Become Host: claim the room peer id
      peer = new Peer(pid, PEER_OPTS)
      await waitPeerOpen(peer)
      isHostMode = true
      peer.on('connection', onGuestConnection)
      peer.on('disconnected', () => {
        emit({ type: 'error', message: '連線已中斷' })
      })
      peer.on('error', (err) => {
        emit({ type: 'error', message: err?.message || 'Peer 錯誤' })
      })
      roleReady = true
      return
    }

    if (firstMsg.type === 'join') {
      // Become Guest: random id, then connect to host
      peer = new Peer(PEER_OPTS)
      await waitPeerOpen(peer)
      isHostMode = false
      hostConn = peer.connect(pid, { reliable: true })
      await waitConnOpen(hostConn)
      hostConn.on('data', (raw) => {
        try {
          emit(raw as ServerMsg)
        } catch {
          /* ignore */
        }
      })
      hostConn.on('close', () => {
        emit({ type: 'error', message: '房主已斷線，房間關閉' })
      })
      peer.on('error', (err) => {
        emit({ type: 'error', message: err?.message || 'Peer 錯誤' })
      })
      roleReady = true
      return
    }

    // Other messages before role is set — ignore until host_room / join
  }

  async function processOutbox(): Promise<void> {
    while (outbox.length) {
      const msg = outbox[0]!
      if (!roleReady) {
        try {
          await ensureRole(msg)
        } catch (e) {
          outbox.shift()
          emit({
            type: 'error',
            message: e instanceof Error ? e.message : '連線失敗',
          })
          destroyAll()
          destroyed = false
          return
        }
      }
      if (!roleReady) {
        // Message was not role-setting; wait for host_room / join
        return
      }
      outbox.shift()
      dispatchSend(msg)
    }
  }

  return {
    clientId,
    isOnline: true,

    async connect(roomId: string) {
      destroyed = false
      pendingRoomId = roomId.trim().toUpperCase()
      roleReady = false
      isHostMode = false
      // Role is established on first send (host_room or join)
    },

    disconnect() {
      destroyAll()
      destroyed = false
    },

    send(msg: ClientMsg) {
      outbox.push(msg)
      setupChain = setupChain.then(() => processOutbox()).catch(() => {})
    },

    onMessage(h) {
      handler = h
    },
  }
}

// ---------------------------------------------------------------------------
// PartyKit transport (optional legacy)
// ---------------------------------------------------------------------------

function createPartyClient(host: string): MultiplayerClient {
  const clientId = localClientId()
  let socket: WebSocket | null = null
  let handler: RoomEventHandler | null = null

  return {
    clientId,
    isOnline: true,
    async connect(id: string) {
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

// ---------------------------------------------------------------------------
// Local mock (single tab, offline UI)
// ---------------------------------------------------------------------------

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
