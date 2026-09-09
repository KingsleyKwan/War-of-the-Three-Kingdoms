/**
 * Lobby UI helpers + pure room state transitions (no network).
 * Network wiring lives in client.ts; app.ts calls these to render.
 */

import type { RoomState, Seat } from './types'
import { makeEmptySeats } from './types'

export interface LobbyViewModel {
  room: RoomState | null
  localName: string
  joinCode: string
  error: string | null
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
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < len; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return s
}

export function fillEmptyWithAi(room: RoomState): RoomState {
  const seats = room.seats.map((s) =>
    s.type === 'empty'
      ? { ...s, type: 'ai' as const, name: `電腦${s.id + 1}`, clientId: undefined, ready: true }
      : s,
  )
  return { ...room, seats }
}

export function setSeatType(room: RoomState, seatId: number, type: 'ai' | 'empty'): RoomState {
  const seats = room.seats.map((s) => {
    if (s.id !== seatId || s.type === 'human') return s
    if (type === 'ai') {
      return { ...s, type: 'ai' as const, name: `電腦${s.id + 1}`, clientId: undefined, ready: true }
    }
    return { ...s, type: 'empty' as const, name: '', clientId: undefined, ready: false }
  })
  return { ...room, seats }
}

export function humanCount(seats: Seat[]): number {
  return seats.filter((s) => s.type === 'human').length
}

export function aiCount(seats: Seat[]): number {
  return seats.filter((s) => s.type === 'ai').length
}

export function emptyCount(seats: Seat[]): number {
  return seats.filter((s) => s.type === 'empty').length
}

export function canStart(room: RoomState, isHost: boolean): boolean {
  return isHost && room.status === 'lobby' && humanCount(room.seats) >= 1
}

export function renderLobby(vm: LobbyViewModel): string {
  const { room, localName, joinCode, error, isHost, myClientId } = vm

  if (!room) {
    return `
    <div class="screen lobby-screen">
      <div class="topbar">
        <button type="button" class="btn ghost" data-go="start">返回</button>
        <h2>房間連線</h2>
      </div>
      ${error ? `<p class="lobby-error">${escapeHtml(error)}</p>` : ''}
      <div class="panel lobby-panel">
        <p class="hint lobby-lead">房主開 8 人身份局，其餘玩家用房號加入。空位可由電腦補上，開局時機由房主決定。</p>
        <label class="field">你的名字
          <input type="text" id="lobby-name" maxlength="8" value="${escapeAttr(localName)}" placeholder="例如：主公" autocomplete="nickname" />
        </label>
        <div class="lobby-actions">
          <button type="button" class="btn primary" id="lobby-create-8">開 8 人房（房主）</button>
          <button type="button" class="btn ghost" id="lobby-create-5">開 5 人房</button>
        </div>
        <hr class="settings-sep" />
        <label class="field">輸入房號加入
          <input type="text" id="lobby-code" maxlength="6" value="${escapeAttr(joinCode)}" placeholder="例如：K7P2" style="text-transform:uppercase" />
        </label>
        <button type="button" class="btn" id="lobby-join">加入房間</button>
      </div>
      <p class="hint">最多 1 位房主 + 7 位玩家。未入座的空位，開局時自動變成電腦。<br/>連線走 PeerJS（無需自架伺服器）。兩邊都要開著此頁。</p>
    </div>`
  }

  const humans = humanCount(room.seats)
  const bots = aiCount(room.seats)
  const vacant = emptyCount(room.seats)
  const mySeat = room.seats.find((s) => s.clientId === myClientId)
  const modeLabel = room.maxPlayers >= 8 ? '八人身份' : '五人身份'

  const seatsHtml = room.seats
    .map((s) => {
      const isOwner = s.clientId === room.hostClientId
      const isMe = s.clientId === myClientId
      let label = '等待加入…'
      if (s.type === 'human') {
        const bits = [escapeHtml(s.name || '玩家')]
        if (isOwner) bits.push('房主')
        if (isMe && !isOwner) bits.push('你')
        if (s.ready) bits.push('已準備')
        label = bits.join(' · ')
      } else if (s.type === 'ai') {
        label = escapeHtml(s.name || '電腦')
      }
      const cls =
        s.type === 'human' ? 'seat-human' : s.type === 'ai' ? 'seat-ai' : 'seat-empty'
      const hostBtns =
        isHost && s.type !== 'human'
          ? s.type === 'empty'
            ? `<button type="button" class="btn ghost seat-act" data-seat-ai="${s.id}">改電腦</button>`
            : `<button type="button" class="btn ghost seat-act" data-seat-empty="${s.id}">改空位</button>`
          : ''
      return `<li class="lobby-seat ${cls}"><span class="idx">${s.id + 1}</span><span class="lobby-seat-name">${label}</span>${hostBtns}</li>`
    })
    .join('')

  const hostActions = isHost
    ? `<div class="lobby-actions">
        ${vacant ? `<button type="button" class="btn ghost" id="lobby-fill-ai">空位全改電腦</button>` : ''}
        <button type="button" class="btn primary" id="lobby-start" ${canStart(room, true) ? '' : 'disabled'}>
          開始${modeLabel}局
        </button>
      </div>
      <p class="hint">人數齊唔齊都得，你決定幾時開始。剩餘空位開局時會自動變電腦。</p>`
    : `<div class="lobby-actions">
        <button type="button" class="btn ${mySeat?.ready ? 'ghost' : 'primary'}" id="lobby-ready">
          ${mySeat?.ready ? '取消準備' : '準備'}
        </button>
      </div>
      <p class="hint">等待房主開始… 準備只係畀房主睇，開局權在房主。</p>`

  return `
  <div class="screen lobby-screen">
    <div class="topbar">
      <button type="button" class="btn ghost" id="lobby-leave">離開</button>
      <h2>${modeLabel}房</h2>
    </div>
    ${error ? `<p class="lobby-error">${escapeHtml(error)}</p>` : ''}
    <div class="panel lobby-panel">
      <p class="lobby-code-row">
        房號 <strong class="lobby-code">${escapeHtml(room.roomId)}</strong>
        <button type="button" class="btn ghost" id="lobby-copy">複製房號</button>
        <button type="button" class="btn ghost" id="lobby-copy-link">複製連結</button>
      </p>
      <ul class="lobby-seats">${seatsHtml}</ul>
      ${hostActions}
    </div>
    <p class="hint">真人 ${humans} · 電腦 ${bots} · 空位 ${vacant} · 上限 ${room.maxPlayers}</p>
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
