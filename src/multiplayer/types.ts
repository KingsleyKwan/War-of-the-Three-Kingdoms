/**
 * Shared multiplayer types — used by both frontend and PartyKit room.
 * Keep this file free of DOM / engine imports so the party server can also use it.
 */

import type { GameSnapshot } from '../engine/types'

export type SeatType = 'human' | 'ai' | 'empty'

export interface Seat {
  id: number
  type: SeatType
  name: string
  clientId?: string
  ready: boolean
}

export type RoomStatus = 'lobby' | 'playing' | 'ended'

export interface RoomState {
  roomId: string
  hostClientId: string
  maxPlayers: number
  status: RoomStatus
  seats: Seat[]
  /** Present once the host has started the match */
  match?: GameSnapshot
}

/** Client → Party */
export type ClientMsg =
  | { type: 'join'; name: string }
  | { type: 'leave' }
  | { type: 'ready'; ready: boolean }
  | { type: 'start' }
  | { type: 'action'; action: unknown }
  /** Host pushes full room after AI fill */
  | { type: 'host_room'; room: RoomState }
  /** Host pushes match snapshot */
  | { type: 'host_match'; match: GameSnapshot }

/** Party → Clients */
export type ServerMsg =
  | { type: 'room'; room: RoomState }
  | { type: 'match'; match: GameSnapshot }
  | { type: 'error'; message: string }
  /** Host-only: a remote player sent an action that the host must apply */
  | { type: 'remote_action'; clientId: string; action: unknown }

export function makeEmptySeats(max: number): Seat[] {
  return Array.from({ length: max }, (_, id) => ({
    id,
    type: 'empty' as const,
    name: '',
    ready: false,
  }))
}

export function firstEmptySeat(seats: Seat[]): Seat | undefined {
  return seats.find((s) => s.type === 'empty')
}

export function seatByClient(seats: Seat[], clientId: string): Seat | undefined {
  return seats.find((s) => s.clientId === clientId)
}
