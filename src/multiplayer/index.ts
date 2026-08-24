/**
 * Multiplayer public API
 *
 * Flow:
 * 1. Lobby UI (renderLobby) → createLocalRoom / join
 * 2. Host clicks Start → fillEmptyWithAi → buildMultiplayerMatch → createMatch
 * 3. Host sends host_room + host_match → all clients enter table
 * 4. AI turns run on host via runAiUntilHuman; snapshot re-broadcast
 * 5. Remote human actions: ClientMsg.action → remote_action → host applies
 *
 * PartyKit:
 *   VITE_PARTYKIT_HOST=xxx.partykit.dev npm run dev
 *   npm run party:dev
 */

export type {
  Seat,
  SeatType,
  RoomState,
  RoomStatus,
  ClientMsg,
  ServerMsg,
} from './types'

export {
  makeEmptySeats,
  firstEmptySeat,
  seatByClient,
} from './types'

export {
  type LobbyViewModel,
  initialLobbyVm,
  createLocalRoom,
  randomRoomId,
  fillEmptyWithAi,
  humanCount,
  canStart,
  renderLobby,
} from './lobby'

export {
  type MultiplayerClient,
  type RoomEventHandler,
  localClientId,
  createMultiplayerClient,
} from './client'

export type { PlayerAction } from './actions'
export { applyPlayerAction, parsePlayerAction } from './actions'
