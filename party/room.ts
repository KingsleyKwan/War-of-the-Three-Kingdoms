/**
 * PartyKit room server.
 *
 * Deploy with: npx partykit dev   /   npx partykit deploy
 * Frontend connects to: wss://<project>.<user>.partykit.dev/parties/main/<roomId>
 *
 * This file only manages lobby seats and forwards actions to the host.
 * Game rules + AI always run on the host browser.
 */

import type { Party, PartyKitServer } from 'partykit/server'
// Shared types are duplicated lightly so the party bundle stays independent.
// Keep in sync with src/multiplayer/types.ts

type SeatType = 'human' | 'ai' | 'empty'

interface Seat {
  id: number
  type: SeatType
  name: string
  clientId?: string
  ready: boolean
}

interface RoomState {
  roomId: string
  hostClientId: string
  maxPlayers: number
  status: 'lobby' | 'playing' | 'ended'
  seats: Seat[]
  match?: unknown
}

type ClientMsg =
  | { type: 'join'; name: string }
  | { type: 'leave' }
  | { type: 'ready'; ready: boolean }
  | { type: 'start' }
  | { type: 'action'; action: unknown }
  | { type: 'host_match'; match: unknown }
  | { type: 'host_room'; room: RoomState }

function emptySeats(n: number): Seat[] {
  return Array.from({ length: n }, (_, id) => ({
    id,
    type: 'empty' as const,
    name: '',
    ready: false,
  }))
}

export default {
  onConnect(conn, room) {
    const clientId =
      (conn as any).url && new URL((conn as any).url).searchParams.get('clientId')
        ? new URL((conn as any).url).searchParams.get('clientId')!
        : conn.id

    let state = room.storage.get('state') as RoomState | undefined
    if (!state) {
      state = {
        roomId: room.id,
        hostClientId: clientId,
        maxPlayers: 5,
        status: 'lobby',
        seats: emptySeats(5),
      }
      state.seats[0] = {
        id: 0,
        type: 'human',
        name: '房主',
        clientId,
        ready: true,
      }
      room.storage.put('state', state)
    }

    conn.send(JSON.stringify({ type: 'room', room: state }))

    conn.addEventListener('message', (evt) => {
      let msg: ClientMsg
      try {
        msg = JSON.parse(String(evt.data))
      } catch {
        return
      }
      const current = (room.storage.get('state') as RoomState) || state!

      if (msg.type === 'join') {
        if (current.status !== 'lobby') {
          conn.send(JSON.stringify({ type: 'error', message: '遊戲已開始' }))
          return
        }
        if (current.seats.some((s) => s.clientId === clientId)) {
          conn.send(JSON.stringify({ type: 'room', room: current }))
          return
        }
        const empty = current.seats.find((s) => s.type === 'empty')
        if (!empty) {
          conn.send(JSON.stringify({ type: 'error', message: '房間已滿' }))
          return
        }
        empty.type = 'human'
        empty.name = (msg.name || '玩家').slice(0, 8)
        empty.clientId = clientId
        empty.ready = false
        room.storage.put('state', current)
        broadcast(room, { type: 'room', room: current })
        return
      }

      if (msg.type === 'ready') {
        const seat = current.seats.find((s) => s.clientId === clientId)
        if (seat) {
          seat.ready = !!msg.ready
          room.storage.put('state', current)
          broadcast(room, { type: 'room', room: current })
        }
        return
      }

      if (msg.type === 'start') {
        if (clientId !== current.hostClientId) {
          conn.send(JSON.stringify({ type: 'error', message: '只有房主可以開始' }))
          return
        }
        if (current.status !== 'lobby') return
        broadcast(room, { type: 'room', room: current })
        return
      }

      if (msg.type === 'host_room') {
        if (clientId !== current.hostClientId) return
        room.storage.put('state', msg.room)
        broadcast(room, { type: 'room', room: msg.room })
        return
      }

      if (msg.type === 'host_match') {
        if (clientId !== current.hostClientId) return
        current.match = msg.match
        current.status = 'playing'
        room.storage.put('state', current)
        broadcast(room, { type: 'match', match: msg.match })
        return
      }

      if (msg.type === 'action') {
        const hostConn = [...room.getConnections()].find((c) => {
          const cid =
            (c as any).url && new URL((c as any).url).searchParams.get('clientId')
              ? new URL((c as any).url).searchParams.get('clientId')
              : c.id
          return cid === current.hostClientId
        })
        if (hostConn) {
          hostConn.send(
            JSON.stringify({
              type: 'remote_action',
              clientId,
              action: msg.action,
            }),
          )
        }
        return
      }

      if (msg.type === 'leave') {
        handleLeave(room, current, clientId)
      }
    })

    conn.addEventListener('close', () => {
      const current = room.storage.get('state') as RoomState | undefined
      if (current) handleLeave(room, current, clientId)
    })
  },
} satisfies PartyKitServer

function broadcast(room: Party.Room, payload: unknown) {
  const data = JSON.stringify(payload)
  for (const c of room.getConnections()) {
    c.send(data)
  }
}

function handleLeave(room: Party.Room, state: RoomState, clientId: string) {
  if (clientId === state.hostClientId) {
    broadcast(room, { type: 'error', message: '房主已離開，房間關閉' })
    room.storage.delete('state')
    return
  }
  const seat = state.seats.find((s) => s.clientId === clientId)
  if (!seat) return
  if (state.status === 'lobby') {
    seat.type = 'empty'
    seat.name = ''
    seat.clientId = undefined
    seat.ready = false
  } else {
    seat.type = 'ai'
    seat.name = `電腦${seat.id + 1}`
    seat.clientId = undefined
    seat.ready = true
  }
  room.storage.put('state', state)
  broadcast(room, { type: 'room', room: state })
}
