import { runAiUntilHuman } from '../ai/simple'
import { getCardDef } from '../data/cards'
import {
  buildFreeMatch,
  buildStageMatch,
  CAOCAO_STAGES,
  loadCampaignProgress,
  unlockNextStage,
  type CampaignStage,
} from '../data/campaigns/caocao'
import { getGeneral } from '../data/generals'
import { CARD_HELP, rankLabel, suitName, suitSymbol } from '../data/help'
import { portraitDataUri } from '../data/portraits'
import {
  cancelTarget,
  confirmGeneralPick,
  createMatch,
  endPlayPhase,
  passResponse,
  selectCard,
  selectTarget,
} from '../engine/game'
import { canReach, seatDistance } from '../engine/helpers'
import type { GameSnapshot, GameMode, PlayerState, PlayFx } from '../engine/types'
import { loadSettings, saveSettings, type AppSettings } from '../persist/settings'
import { APP_VERSION } from '../version'

type Screen = 'start' | 'setup' | 'settings' | 'story' | 'stage' | 'table' | 'result'

interface AppState {
  screen: Screen
  setupMode: GameMode
  useEx: boolean
  stage: CampaignStage | null
  allyChoice: string | null
  game: GameSnapshot | null
  selectedUid: string | null
  settings: AppSettings
  detailHtml: string | null
  aiBusy: boolean
}

const app: AppState = {
  screen: 'start',
  setupMode: 'duel',
  useEx: false,
  stage: null,
  allyChoice: null,
  game: null,
  selectedUid: null,
  settings: loadSettings(),
  detailHtml: null,
  aiBusy: false,
}

const root = () => document.querySelector<HTMLDivElement>('#app')!

export function startApp(): void {
  render()
}

function render(): void {
  const el = root()
  switch (app.screen) {
    case 'start':
      el.innerHTML = renderStart()
      bindStart()
      break
    case 'setup':
      el.innerHTML = renderSetup()
      bindSetup()
      break
    case 'settings':
      el.innerHTML = renderSettings()
      bindSettings()
      break
    case 'story':
      el.innerHTML = renderStoryList()
      bindStoryList()
      break
    case 'stage':
      el.innerHTML = renderStageBrief()
      bindStageBrief()
      break
    case 'table':
      el.innerHTML = renderTable()
      bindTable()
      break
    case 'result':
      el.innerHTML = renderResult()
      bindResult()
      break
  }
  if (app.detailHtml) {
    el.insertAdjacentHTML('beforeend', renderDetailModal(app.detailHtml))
    root().querySelector('#detail-close')?.addEventListener('click', () => {
      app.detailHtml = null
      render()
    })
    root().querySelector('#detail-backdrop')?.addEventListener('click', () => {
      app.detailHtml = null
      render()
    })
  }
}

function renderDetailModal(body: string): string {
  return `<div class="modal-backdrop" id="detail-backdrop"></div>
  <div class="modal" role="dialog" aria-modal="true">
    <div class="modal-body">${body}</div>
    <button type="button" class="btn primary" id="detail-close">關閉</button>
  </div>`
}

function renderStart(): string {
  return `
  <div class="screen start-screen">
    <div class="start-bg" aria-hidden="true"></div>
    <div class="start-content">
      <p class="brand">sley</p>
      <h1 class="title">單機三國殺</h1>
      <p class="tagline">E殺風格・自由對戰與曹操傳</p>
      <div class="cta-row">
        <button type="button" class="btn primary" data-go="setup">自由對戰</button>
        <button type="button" class="btn" data-go="story">劇情模式</button>
        <button type="button" class="btn ghost" data-go="settings">設定</button>
      </div>
      <p class="version" id="app-version">v${APP_VERSION}</p>
    </div>
  </div>`
}

function bindStart(): void {
  root().querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => {
      app.screen = (btn as HTMLElement).dataset.go as Screen
      render()
    })
  })
}

function renderSettings(): string {
  const s = app.settings
  return `
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>設定</h2>
    </header>
    <div class="panel">
      <label class="field">
        <span>電腦思考時間：<strong id="delay-label">${(s.thinkDelayMs / 1000).toFixed(1)} 秒</strong></span>
        <input type="range" id="think-delay" min="0" max="3000" step="100" value="${s.thinkDelayMs}" />
        <span class="hint">每個電腦行動之間的間隔（預設 1 秒）</span>
      </label>
      <label class="field check">
        <input type="checkbox" id="show-portraits" ${s.showPortraits ? 'checked' : ''} />
        <span>顯示武將頭像</span>
      </label>
      <label class="field check">
        <input type="checkbox" id="force-select" ${s.forceSelectGeneral ? 'checked' : ''} />
        <span>對局內可選全部武將（關閉則隨機三選一）</span>
      </label>
      <button type="button" class="btn primary" id="save-settings">儲存</button>
    </div>
  </div>`
}

function bindSettings(): void {
  const range = root().querySelector('#think-delay') as HTMLInputElement
  const label = root().querySelector('#delay-label')!
  range.addEventListener('input', () => {
    label.textContent = `${(Number(range.value) / 1000).toFixed(1)} 秒`
  })
  root().querySelector('[data-back]')?.addEventListener('click', () => {
    app.screen = 'start'
    render()
  })
  root().querySelector('#save-settings')?.addEventListener('click', () => {
    app.settings = {
      thinkDelayMs: Number(range.value),
      showPortraits: (root().querySelector('#show-portraits') as HTMLInputElement).checked,
      forceSelectGeneral: (root().querySelector('#force-select') as HTMLInputElement).checked,
    }
    saveSettings(app.settings)
    app.screen = 'start'
    render()
  })
}

function renderSetup(): string {
  return `
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>自由對戰設定</h2>
    </header>
    <div class="panel">
      <label class="field">
        <span>模式</span>
        <select id="mode">
          <option value="duel" ${app.setupMode === 'duel' ? 'selected' : ''}>1v1 對決</option>
          <option value="identity5" ${app.setupMode === 'identity5' ? 'selected' : ''}>五人身份局</option>
          <option value="identity8" ${app.setupMode === 'identity8' ? 'selected' : ''}>八人身份局</option>
        </select>
      </label>
      <label class="field check">
        <input type="checkbox" id="ex" ${app.useEx ? 'checked' : ''} />
        <span>啟用卡包：軍爭（EX）</span>
      </label>
      <p class="hint">標準包固定啟用。進入對局後會先看到座位與身份，再從系統隨機抽出的三名武將中選擇（可在設定改為全部可選）。</p>
      <button type="button" class="btn primary" id="start-match">開始對戰</button>
    </div>
  </div>`
}

function kingdomName(k: string): string {
  return ({ wei: '魏', shu: '蜀', wu: '吳', qun: '群', god: '神' } as Record<string, string>)[k] ?? k
}

function bindSetup(): void {
  root().querySelector('[data-back]')?.addEventListener('click', () => {
    app.screen = 'start'
    render()
  })
  root().querySelector('#start-match')?.addEventListener('click', () => {
    void startFreeMatch()
  })
}

async function startFreeMatch(): Promise<void> {
  const mode = (root().querySelector('#mode') as HTMLSelectElement).value as GameMode
  const useEx = (root().querySelector('#ex') as HTMLInputElement).checked
  app.setupMode = mode
  app.useEx = useEx
  const config = buildFreeMatch({
    mode,
    useEx,
    forceSelectGeneral: app.settings.forceSelectGeneral,
  })
  app.game = createMatch(config)
  app.selectedUid = null
  app.stage = null
  app.screen = 'table'
  render()
}

function renderStoryList(): string {
  const progress = loadCampaignProgress()
  return `
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>劇情・曹操傳</h2>
    </header>
    <p class="story-intro">取材 E殺曹操傳風格的單人關卡。目前開放前三關，後續可繼續擴充。</p>
    <ul class="stage-list">
      ${CAOCAO_STAGES.map((s) => {
        const locked = s.index > progress
        return `<li class="${locked ? 'locked' : ''}">
          <button type="button" data-stage="${s.id}" ${locked ? 'disabled' : ''}>
            <span class="idx">第${s.index}關</span>
            <span class="st">${s.title}</span>
            <span class="sub">${s.subtitle}</span>
            ${locked ? '<span class="lock">未解鎖</span>' : ''}
          </button>
        </li>`
      }).join('')}
      <li class="locked soon">
        <button type="button" disabled>
          <span class="idx">第4關起</span>
          <span class="st">更多關卡</span>
          <span class="sub">即將加入</span>
        </button>
      </li>
    </ul>
  </div>`
}

function bindStoryList(): void {
  root().querySelector('[data-back]')?.addEventListener('click', () => {
    app.screen = 'start'
    render()
  })
  root().querySelectorAll('[data-stage]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.stage!
      app.stage = CAOCAO_STAGES.find((s) => s.id === id) ?? null
      app.allyChoice = app.stage?.allyChoices?.[0] ?? null
      app.screen = 'stage'
      render()
    })
  })
}

function renderStageBrief(): string {
  const s = app.stage!
  const choices = s.allyChoices ?? []
  return `
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>${s.title}</h2>
    </header>
    <div class="panel">
      <p class="briefing">${escapeHtml(s.briefing).replace(/\n/g, '<br/>')}</p>
      <p class="meta">卡包：${s.packs.includes('ex') ? '標準 + 軍爭' : '標準包'}</p>
      ${
        choices.length
          ? `<label class="field"><span>自選副將</span>
            <select id="ally">${choices
              .map((id) => {
                const g = getGeneral(id === 'dianwei_proxy' ? 'xuchu' : id)
                const label = id === 'dianwei_proxy' ? `${g.name}（代典韋）` : g.name
                return `<option value="${id}" ${app.allyChoice === id ? 'selected' : ''}>${label}</option>`
              })
              .join('')}</select></label>`
          : ''
      }
      <button type="button" class="btn primary" id="enter-stage">進入戰鬥</button>
    </div>
  </div>`
}

function bindStageBrief(): void {
  root().querySelector('[data-back]')?.addEventListener('click', () => {
    app.screen = 'story'
    render()
  })
  root().querySelector('#enter-stage')?.addEventListener('click', () => {
    void startStageMatch()
  })
}

async function startStageMatch(): Promise<void> {
  const ally = (root().querySelector('#ally') as HTMLSelectElement | null)?.value
  app.allyChoice = ally ?? null
  const config = buildStageMatch(app.stage!, app.allyChoice ?? undefined)
  app.game = createMatch(config)
  app.selectedUid = null
  app.screen = 'table'
  render()
  await continueAi()
}

function identityLabelVisible(p: PlayerState, viewer: PlayerState, mode: GameMode): string {
  if (p.identity === 'none') return ''
  const label =
    ({ lord: '主公', loyal: '忠臣', rebel: '反賊', spy: '內奸' } as Record<string, string>)[
      p.identity
    ] ?? ''
  if (mode === 'duel') return ''
  // Self always sees own identity
  if (p.id === viewer.id) return label
  // 主公 always visible
  if (p.identity === 'lord') return '主公'
  // Others: only after death
  if (!p.alive) return label
  return '？'
}

function renderTable(): string {
  const g = app.game!
  const human = g.players.find((p) => p.isHuman)!
  const prompt = g.prompt
  const picking = g.matchPhase === 'pick_general'
  const isHumanTurn = prompt.actorId === human.id && !app.aiBusy && !picking
  const n = g.players.length
  const thinking =
    app.aiBusy && prompt.actorId !== null && !g.players[prompt.actorId]?.isHuman
      ? `<div class="thinking">${escapeHtml(g.players[prompt.actorId].name)} 思考中…</div>`
      : ''

  return `
  <div class="screen table-screen">
    <header class="battle-top">
      <div>
        <strong>${picking ? '選將階段' : `第 ${g.round} 輪`}</strong>
        <span class="phase">${picking ? '請選擇武將' : phaseName(g.phase)}</span>
      </div>
      <div class="deck-info">${picking ? `座位 ${n} 人` : `牌堆 ${g.deck.length}　棄牌 ${g.discard.length}`}</div>
    </header>
    ${thinking}
    <div class="arena" style="--n:${n}" id="arena">
      ${g.players
        .map((p) => {
          const hasGen = !!p.generalId
          const gen = hasGen ? getGeneral(p.generalId) : null
          const active = !picking && g.currentPlayer === p.id
          const targetable =
            !picking &&
            prompt.kind === 'choose_target' &&
            prompt.targetIds?.includes(p.id) &&
            isHumanTurn
          const visual = (p.id - human.id + n) % n
          const angle = (visual / n) * 360 + 90
          const distFromHuman =
            p.id === human.id
              ? '—'
              : String(
                  seatDistance(
                    human.id,
                    p.id,
                    n,
                    g.players.map((x) => x.alive),
                  ),
                )
          const reach =
            !picking && p.id !== human.id && p.alive && hasGen && canReach(g, human.id, p.id)
              ? 'in-range'
              : ''
          const idText = identityLabelVisible(p, human, g.config.mode)
          const hurt = g.fx.damages.find((d) => d.playerId === p.id)
          const portrait =
            app.settings.showPortraits && gen
              ? `<img class="portrait" src="${portraitDataUri(gen.name, gen.kingdom, gen.gender)}" alt="" width="48" height="48" />`
              : app.settings.showPortraits
                ? `<div class="portrait portrait-empty" aria-hidden="true">？</div>`
                : ''
          const infoBtn = hasGen
            ? `<button type="button" class="info-btn" data-info-seat="${p.id}" title="詳情" aria-label="詳情">ℹ</button>`
            : ''
          return `<div class="seat-wrap" style="--angle:${angle}deg" data-visual="${visual}" data-seat-pos="${p.id}">
            <div class="seat ${p.alive ? '' : 'dead'} ${active ? 'active' : ''} ${p.isHuman ? 'human' : ''} ${targetable ? 'targetable' : ''} ${reach} ${picking && !hasGen ? 'hidden-gen' : ''} ${hurt ? 'hurt' : ''}" data-seat="${p.id}" role="${targetable ? 'button' : 'group'}" tabindex="${targetable ? '0' : '-1'}">
              ${portrait}
              <div class="seat-head">
                <span class="seat-gen">${gen ? gen.name : '未亮將'}</span>
                ${infoBtn}
              </div>
              <div class="seat-name">${escapeHtml(p.name)}${idText ? `・${idText}` : ''}</div>
              <div class="hp">${hasGen ? hearts(p.hp, p.maxHp) : '—'}</div>
              <div class="equip">${hasGen ? equipText(p) : picking ? '等待選將' : '無裝備'}</div>
              <div class="meta-row"><span>手牌 ${picking ? '—' : p.hand.length}</span><span class="dist">距 ${distFromHuman}</span></div>
              ${
                hurt
                  ? `<span class="dmg-float" data-dmg-seq="${hurt.seq}">-${hurt.amount}</span>`
                  : ''
              }
            </div>
          </div>`
        })
        .join('')}
      ${renderArenaFx(g, human.id, n)}
    </div>
    <div class="prompt-bar">${escapeHtml(
      app.selectedUid && prompt.kind === 'choose_card'
        ? '已選取手牌 — 再點一次同一張牌以打出，或點其他牌改選'
        : prompt.message || '等待中…',
    )}</div>
    ${picking ? renderGeneralPickPanel(g) : ''}
    <div class="log">${[...g.log]
      .slice(-6)
      .map((l) => `<div>${escapeHtml(l.text)}</div>`)
      .join('')}</div>
    ${
      picking
        ? ''
        : `<div class="hand">
      ${human.hand
        .map((c) => {
          const def = getCardDef(c.defId)
          const selectable =
            isHumanTurn &&
            !!prompt.cardUids?.includes(c.uid) &&
            (prompt.kind === 'choose_card' ||
              prompt.kind === 'discard' ||
              prompt.kind === 'respond_shan' ||
              prompt.kind === 'respond_sha')
          const selected = app.selectedUid === c.uid
          const red = def.suit === 'heart' || def.suit === 'diamond'
          return `<div class="card-wrap">
            <button type="button" class="card ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''} ${red ? 'red' : 'black'}" data-uid="${c.uid}" ${selectable ? '' : 'disabled'}>
              <span class="csuit ${red ? 'red' : ''}">${suitSymbol(def.suit)}${rankLabel(def.rank)}</span>
              <span class="cname">${def.name}</span>
              <span class="ctype">${typeName(def.type)}</span>
            </button>
            <button type="button" class="info-btn card-info" data-info-card="${c.uid}" title="牌面說明">ℹ</button>
          </div>`
        })
        .join('')}
    </div>`
    }
    <div class="actions">
      ${
        !picking && isHumanTurn && prompt.kind === 'choose_card' && app.selectedUid
          ? `<button type="button" class="btn ghost" id="cancel-select">取消選牌</button>`
          : ''
      }
      ${
        !picking && isHumanTurn && prompt.kind === 'choose_card'
          ? `<button type="button" class="btn" id="end-play">結束出牌</button>`
          : ''
      }
      ${
        !picking && isHumanTurn && (prompt.kind === 'respond_shan' || prompt.kind === 'respond_sha')
          ? `<button type="button" class="btn" id="pass-resp">放棄</button>`
          : ''
      }
      ${
        !picking && isHumanTurn && prompt.kind === 'choose_target'
          ? `<button type="button" class="btn" id="cancel-tgt">取消</button>`
          : ''
      }
      <button type="button" class="btn ghost" id="flee">退出</button>
    </div>
  </div>`
}

function renderGeneralPickPanel(g: GameSnapshot): string {
  const ids = g.prompt.generalIds ?? []
  const title = ids.length > 3 ? '選擇武將（全部可選）' : '系統隨機三將，請選一'
  return `<div class="pick-panel">
    <h3>${title}</h3>
    <div class="pick-grid">
      ${ids
        .map((id) => {
          const gen = getGeneral(id)
          const portrait = app.settings.showPortraits
            ? `<img class="pick-portrait" src="${portraitDataUri(gen.name, gen.kingdom, gen.gender)}" alt="" />`
            : ''
          return `<div class="pick-card">
            ${portrait}
            <div class="pick-name">${gen.name}</div>
            <div class="pick-meta">${kingdomName(gen.kingdom)}・${gen.maxHp} 血</div>
            <p class="pick-skill">${escapeHtml(gen.skillText)}</p>
            <div class="pick-actions">
              <button type="button" class="btn ghost" data-gen-info="${id}">詳情</button>
              <button type="button" class="btn primary" data-pick-gen="${id}">選定</button>
            </div>
          </div>`
        })
        .join('')}
    </div>
  </div>`
}

function seatPoint(playerId: number, humanId: number, n: number): { x: number; y: number } {
  const visual = (playerId - humanId + n) % n
  const deg = (visual / n) * 360 + 90
  const rad = (deg * Math.PI) / 180
  // Percent of arena box; matches CSS --radius ~38% of min side, center 50/50
  const r = 38
  return {
    x: 50 + Math.cos(rad) * r,
    y: 50 + Math.sin(rad) * r,
  }
}

function resolvePlayFx(g: GameSnapshot, humanId: number): PlayFx | null {
  if (g.fx.play) return g.fx.play
  // While choosing a target, preview the card in hand
  if (g.prompt.kind === 'choose_target' && g.prompt.cardUids?.[0] && g.prompt.actorId !== null) {
    const actor = g.players[g.prompt.actorId]
    const card = actor?.hand.find((c) => c.uid === g.prompt.cardUids![0])
    if (card) {
      const def = getCardDef(card.defId)
      return {
        cardName: def.name,
        suit: def.suit,
        rank: def.rank,
        sourceId: g.prompt.actorId,
        targetIds: [],
        note: '選擇目標',
        seq: 0,
      }
    }
  }
  void humanId
  return null
}

function renderArenaFx(g: GameSnapshot, humanId: number, n: number): string {
  const play = resolvePlayFx(g, humanId)
  if (!play && !g.fx.damages.length) {
    return `<div class="arena-center" aria-hidden="true"><span>距離</span></div>`
  }

  const src = play ? seatPoint(play.sourceId, humanId, n) : null
  const arrows =
    play && src
      ? play.targetIds
          .filter((tid) => tid !== play.sourceId)
          .map((tid) => {
            const dst = seatPoint(tid, humanId, n)
            return arrowLine(src.x, src.y, dst.x, dst.y, play.seq)
          })
          .join('')
      : ''

  const selfTarget =
    play && play.targetIds.length === 1 && play.targetIds[0] === play.sourceId
      ? `<div class="fx-self-ring" style="left:${src!.x}%;top:${src!.y}%"></div>`
      : ''

  const red = play && (play.suit === 'heart' || play.suit === 'diamond')
  const cardHtml = play
    ? `<div class="fx-card ${red ? 'red' : 'black'}" data-fx-seq="${play.seq}">
        <span class="csuit">${suitSymbol(play.suit)}${rankLabel(play.rank)}</span>
        <span class="cname">${escapeHtml(play.cardName)}</span>
        ${play.note ? `<span class="fx-note">${escapeHtml(play.note)}</span>` : ''}
      </div>`
    : ''

  return `
    <div class="arena-fx" aria-hidden="true">
      <svg class="fx-arrows" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#c4a35a" />
          </marker>
        </defs>
        ${arrows}
      </svg>
      ${selfTarget}
      <div class="fx-card-slot">${cardHtml || '<span class="arena-center-label">距離</span>'}</div>
    </div>`
}

function arrowLine(x1: number, y1: number, x2: number, y2: number, seq: number): string {
  // Shorten so arrow tips sit near seats, not under card center
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const inset = Math.min(8, len * 0.2)
  const sx = x1 + (dx / len) * inset
  const sy = y1 + (dy / len) * inset
  const ex = x2 - (dx / len) * inset
  const ey = y2 - (dy / len) * inset
  return `<line class="fx-arrow-line" data-fx-seq="${seq}" x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" marker-end="url(#arrowHead)" />`
}

function hearts(hp: number, max: number): string {
  const on = Math.max(0, hp)
  return '●'.repeat(on) + '○'.repeat(Math.max(0, max - on))
}

function equipText(p: PlayerState): string {
  const parts: string[] = []
  for (const slot of ['weapon', 'armor', 'horseMinus', 'horsePlus'] as const) {
    const e = p.equips[slot]
    if (e) parts.push(getCardDef(e.defId).name)
  }
  return parts.length ? parts.join('・') : '無裝備'
}

function phaseName(p: string): string {
  return (
    {
      prepare: '準備',
      judge: '判定',
      draw: '摸牌',
      play: '出牌',
      discard: '棄牌',
      end: '結束',
    } as Record<string, string>
  )[p] ?? p
}

function typeName(t: string): string {
  return ({ basic: '基本', trick: '錦囊', equip: '裝備' } as Record<string, string>)[t] ?? t
}

function seatDetailHtml(p: PlayerState): string {
  if (!p.generalId) {
    return `<h3>${escapeHtml(p.name)}</h3><p class="muted">尚未亮出武將。</p>`
  }
  const gen = getGeneral(p.generalId)
  const equips = (['weapon', 'armor', 'horseMinus', 'horsePlus'] as const)
    .map((slot) => {
      const e = p.equips[slot]
      if (!e) return null
      const def = getCardDef(e.defId)
      return `<li><strong>${def.name}</strong>（${suitName(def.suit)}${rankLabel(def.rank)}）<br/><span class="muted">${CARD_HELP[def.kind] ?? ''}</span></li>`
    })
    .filter(Boolean)
    .join('')
  return `<h3>${gen.name}</h3>
    <p class="muted">${kingdomName(gen.kingdom)}・${gen.maxHp} 血・${gen.gender === 'female' ? '女' : '男'}</p>
    <h4>武將技</h4>
    <p>${escapeHtml(gen.skillText)}</p>
    <h4>裝備</h4>
    ${equips ? `<ul class="detail-list">${equips}</ul>` : '<p class="muted">無</p>'}`
}

function generalPickDetailHtml(id: string): string {
  const gen = getGeneral(id)
  return `<h3>${gen.name}</h3>
    <p class="muted">${kingdomName(gen.kingdom)}・體力上限 ${gen.maxHp}・${gen.gender === 'female' ? '女' : '男'}</p>
    <h4>武將技</h4>
    <p>${escapeHtml(gen.skillText)}</p>`
}

function cardDetailHtml(uid: string, handOf: PlayerState): string {
  const card = handOf.hand.find((c) => c.uid === uid)
  if (!card) return '<p>找不到此牌</p>'
  const def = getCardDef(card.defId)
  return `<h3>${def.name}</h3>
    <p>${suitSymbol(def.suit)} ${suitName(def.suit)} ${rankLabel(def.rank)}　·　${typeName(def.type)}</p>
    <p>${CARD_HELP[def.kind] ?? '暫無說明。'}</p>`
}

async function continueAi(): Promise<void> {
  const g = app.game
  if (!g || app.aiBusy) return
  if (g.matchPhase === 'pick_general') return
  // Brief pause after human action so their card FX is visible
  if (g.fx.play || g.fx.damages.length) {
    app.aiBusy = true
    render()
    const hold = Math.min(Math.max(app.settings.thinkDelayMs, 500), 1000)
    await new Promise((r) => setTimeout(r, hold))
    app.aiBusy = false
  }
  app.aiBusy = true
  render()
  try {
    await runAiUntilHuman(g, () => {
      if (app.screen === 'table' && app.game === g) render()
    })
  } finally {
    app.aiBusy = false
  }
  maybeFinish()
  render()
}

function bindTable(): void {
  const g = app.game!
  const human = g.players.find((p) => p.isHuman)!

  root().querySelectorAll('[data-gen-info]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.genInfo!
      app.detailHtml = generalPickDetailHtml(id)
      render()
    })
  })

  root().querySelectorAll('[data-pick-gen]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.pickGen!
      confirmGeneralPick(g, id)
      app.detailHtml = null
      render()
      void continueAi()
    })
  })

  root().querySelectorAll('[data-info-seat]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      e.preventDefault()
      const id = Number((btn as HTMLElement).dataset.infoSeat)
      app.detailHtml = seatDetailHtml(g.players[id])
      render()
    })
  })

  root().querySelectorAll('[data-info-card]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      e.preventDefault()
      const uid = (btn as HTMLElement).dataset.infoCard!
      app.detailHtml = cardDetailHtml(uid, human)
      render()
    })
  })

  root().querySelectorAll('.card.selectable').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (app.aiBusy || g.matchPhase === 'pick_general') return
      const uid = (btn as HTMLElement).dataset.uid!
      // Outgoing play: first click selects, second click confirms
      if (g.prompt.kind === 'choose_card') {
        if (app.selectedUid !== uid) {
          app.selectedUid = uid
          render()
          return
        }
        selectCard(g, human.id, uid)
        app.selectedUid = null
        void continueAi()
        return
      }
      // Responses / discard: single click
      selectCard(g, human.id, uid)
      app.selectedUid = null
      void continueAi()
    })
  })

  root().querySelector('#cancel-select')?.addEventListener('click', () => {
    app.selectedUid = null
    render()
  })

  root().querySelectorAll('.seat.targetable').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (app.aiBusy || g.matchPhase === 'pick_general') return
      const id = Number((btn as HTMLElement).dataset.seat)
      selectTarget(g, human.id, id)
      void continueAi()
    })
  })

  root().querySelector('#end-play')?.addEventListener('click', () => {
    if (app.aiBusy) return
    endPlayPhase(g, human.id)
    void continueAi()
  })

  root().querySelector('#pass-resp')?.addEventListener('click', () => {
    if (app.aiBusy) return
    passResponse(g, human.id)
    void continueAi()
  })

  root().querySelector('#cancel-tgt')?.addEventListener('click', () => {
    cancelTarget(g, human.id)
    render()
  })

  root().querySelector('#flee')?.addEventListener('click', () => {
    app.game = null
    app.aiBusy = false
    app.screen = app.stage ? 'story' : 'start'
    render()
  })
}

function maybeFinish(): void {
  const g = app.game
  if (g?.winnerIds) {
    if (g.config.campaignStageId && g.winnerIds.includes(0)) {
      const stage = CAOCAO_STAGES.find((s) => s.id === g.config.campaignStageId)
      if (stage) unlockNextStage(stage.index)
    }
    app.screen = 'result'
  }
}

function renderResult(): string {
  const g = app.game!
  const humanWin = g.winnerIds?.includes(0)
  return `
  <div class="screen panel-screen result-screen">
    <h2>${humanWin ? '勝利' : '敗北'}</h2>
    <p>${escapeHtml(g.resultMessage ?? '')}</p>
    <div class="cta-row">
      <button type="button" class="btn primary" id="again">再來一局</button>
      <button type="button" class="btn" id="home">回首頁</button>
      ${app.stage ? `<button type="button" class="btn" id="story">關卡列表</button>` : ''}
    </div>
  </div>`
}

function bindResult(): void {
  root().querySelector('#home')?.addEventListener('click', () => {
    app.game = null
    app.stage = null
    app.screen = 'start'
    render()
  })
  root().querySelector('#story')?.addEventListener('click', () => {
    app.game = null
    app.screen = 'story'
    render()
  })
  root().querySelector('#again')?.addEventListener('click', () => {
    if (app.stage) {
      app.screen = 'stage'
      render()
      return
    }
    app.screen = 'setup'
    render()
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
