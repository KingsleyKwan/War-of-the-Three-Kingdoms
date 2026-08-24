/**
 * Lobby UI helpers + pure room state transitions (no network).
 * Network wiring lives in client.ts; app.ts calls these to render.
 */

import type { RoomState, Seat } from './types'
import { makeEmptySeats } from './types'

export interface LobbyViewModel {
  room: RoomState | null
  /** Local player name typed in the join/create form */
  localName: string
  /** Room code typed when joining */
  joinCode: string
  /** Error banner */
  error: string | null
  /** Am I the host of the current room? */
  isHost: boolean
  myClientId: string | null
}

export function initialLobbyVm(): LobbyViewModel {
  return {
    room: null,
    localName: '',
    joinCode: '',
    error: null,
    isHost: false,
    myClientId: null,
  }
}

/** Create a local-only room (used before PartyKit is connected, or for UI preview). */
export function createLocalRoom(
  hostClientId: string,
  hostName: string,
  maxPlayers: number,
  roomId?: string,
): RoomState {
  const seats = makeEmptySeats(maxPlayers)
  seats[0] = {
    id: 0,
    type: 'human',
    name: hostName || '房主',
    clientId: hostClientId,
    ready: true,
  }
  return {
    roomId: roomId ?? randomRoomId(),
    hostClientId,
    maxPlayers,
    status: 'lobby',
    seats,
  }
}

export function randomRoomId(len = 4): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1
  let s = ''
  for (let i = 0; i < len; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return s
}

/** Fill every empty seat with AI right before the match starts. */
export function fillEmptyWithAi(room: RoomState): RoomState {
  const seats = room.seats.map((s) =>
    s.type === 'empty'
      ? { ...s, type: 'ai' as const, name: `電腦${s.id + 1}`, ready: true }
      : s,
  )
  return { ...room, seats }
}

export function humanCount(seats: Seat[]): number {
  return seats.filter((s) => s.type === 'human').length
}

export function canStart(room: RoomState, isHost: boolean): boolean {
  return isHost && room.status === 'lobby' && humanCount(room.seats) >= 1
}

/** Render lobby HTML (string template, same style as the rest of the app). */
export function renderLobby(vm: LobbyViewModel): string {
  const { room, localName, joinCode, error, isHost } = vm

  if (!room) {
    return `
    <div class="screen lobby-screen">
      <div class="topbar">
        <button type="button" class="btn ghost" data-go="start">返回</button>
        <h2>多人對戰</h2>
      </div>
      ${error ? `<p class="lobby-error">${escapeHtml(error)}</p>` : ''}
      <div class="panel lobby-panel">
        <label class="field">你的名字
          <input type="text" id="lobby-name" maxlength="8" value="${escapeAttr(localName)}" placeholder="例如：主公" />
        </label>
        <div class="lobby-actions">
          <button type="button" class="btn primary" id="lobby-create-5">開 5 人房</button>
          <button type="button" class="btn primary" id="lobby-create-8">開 8 人房</button>
        </div>
        <hr class="settings-sep" />
        <label class="field">輸入房號加入
          <input type="text" id="lobby-code" maxlength="6" value="${escapeAttr(joinCode)}" placeholder="例如：K7P2" style="text-transform:uppercase" />
        </label>
        <button type="button" class="btn" id="lobby-join">加入房間</button>
      </div>
      <p class="hint">人數不足會用電腦補位。房主開始後即開局。<br/>連線：PeerJS（無需自架伺服器）</p>
    </div>`
  }

  const seatsHtml = room.seats
    .map((s) => {
      const label =
        s.type === 'human'
          ? `${escapeHtml(s.name)}${s.ready ? ' · 已準備' : ''}`
          : s.type === 'ai'
            ? '電腦'
            : '等待中…'
      const cls =
        s.type === 'human' ? 'seat-human' : s.type === 'ai' ? 'seat-ai' : 'seat-empty'
      return `<li class="lobby-seat ${cls}"><span class="idx">${s.id + 1}</span> ${label}</li>`
    })
    .join('')

  return `
  <div class="screen lobby-screen">
    <div class="topbar">
      <button type="button" class="btn ghost" id="lobby-leave">離開</button>
      <h2>房間 ${escapeHtml(room.roomId)}</h2>
    </div>
    ${error ? `<p class="lobby-error">${escapeHtml(error)}</p>` : ''}
    <div class="panel lobby-panel">
      <p class="lobby-code-row">
        房號 <strong class="lobby-code">${escapeHtml(room.roomId)}</strong>
        <button type="button" class="btn ghost" id="lobby-copy">複製</button>
      </p>
      <ul class="lobby-seats">${seatsHtml}</ul>
      <div class="lobby-actions">
        ${
          isHost
            ? `<button type="button" class="btn primary" id="lobby-start" ${canStart(room, true) ? '' : 'disabled'}>開始遊戲</button>`
            : `<p class="hint">等待房主開始…</p>`
        }
      </div>
    </div>
    <p class="hint">目前 ${humanCount(room.seats)} 人 · 上限 ${room.maxPlayers} · 空位開局時會變電腦</p>
  </div>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;')
}
