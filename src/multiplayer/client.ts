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
  debug: 1 as 0 | 1 | 2 | 3,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },
}

/** Namespace room codes on the shared public PeerJS cloud. */
function peerIdForRoom(roomId: string): string {
  return 'wtk-' + roomId.trim().toUpperCase()
}

function peerErrorMessage(err: unknown): string {
  if (!err) return '連線失敗'
  const e = err as { message?: string; type?: string }
  const type = e.type || ''
  const msg = e.message || String(err)
  if (type === 'peer-unavailable' || /unavailable/i.test(msg)) {
    return '搵唔到房主（房號錯誤，或房主尚未準備好／已離開）。請等房主開好房再加入。'
  }
  if (type === 'network' || /network/i.test(msg)) {
    return '網絡錯誤，請檢查網絡後重試'
  }
  if (type === 'server-error' || type === 'socket-error') {
    return 'PeerJS 雲端暫時不可用，請稍後再試'
  }
  if (type === 'unavailable-id') {
    return '房號被佔用，請重新開房'
  }
  return msg || '連線失敗'
}

export function createMultiplayerClient(): MultiplayerClient {
  if (MP_OFFLINE) return createLocalMockClient()
  if (PARTY_HOST) return createPartyClient(PARTY_HOST)
  return createPeerClient()
}
