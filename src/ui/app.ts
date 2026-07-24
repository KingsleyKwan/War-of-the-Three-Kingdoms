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
import { getGeneral, listGeneralsForPick } from '../data/generals'
import {
  cancelTarget,
  createMatch,
  endPlayPhase,
  passResponse,
  selectCard,
  selectTarget,
} from '../engine/game'
import type { GameSnapshot, GameMode } from '../engine/types'
import { APP_VERSION } from '../version'

type Screen = 'start' | 'setup' | 'story' | 'stage' | 'table' | 'result'

interface AppState {
  screen: Screen
  setupMode: GameMode
  useEx: boolean
  generalId: string
  stage: CampaignStage | null
  allyChoice: string | null
  game: GameSnapshot | null
  selectedUid: string | null
}

const app: AppState = {
  screen: 'start',
  setupMode: 'duel',
  useEx: false,
  generalId: 'caocao',
  stage: null,
  allyChoice: null,
  game: null,
  selectedUid: null,
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

function renderSetup(): string {
  const generals = listGeneralsForPick()
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
        </select>
      </label>
      <label class="field check">
        <input type="checkbox" id="ex" ${app.useEx ? 'checked' : ''} />
        <span>啟用卡包：軍爭（EX）</span>
      </label>
      <p class="hint">標準包固定啟用。軍爭包會加入火攻、鐵索、寒冰劍等牌。</p>
      <label class="field">
        <span>你的武將</span>
        <select id="general">
          ${generals
            .map(
              (g) =>
                `<option value="${g.id}" ${g.id === app.generalId ? 'selected' : ''}>${g.name}（${kingdomName(g.kingdom)}·${g.maxHp}血）</option>`,
            )
            .join('')}
        </select>
      </label>
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
    const mode = (root().querySelector('#mode') as HTMLSelectElement).value as GameMode
    const useEx = (root().querySelector('#ex') as HTMLInputElement).checked
    const generalId = (root().querySelector('#general') as HTMLSelectElement).value
    app.setupMode = mode
    app.useEx = useEx
    app.generalId = generalId
    const config = buildFreeMatch({ mode, useEx, humanGeneralId: generalId })
    app.game = createMatch(config)
    app.selectedUid = null
    app.screen = 'table'
    runAiUntilHuman(app.game)
    maybeFinish()
    render()
  })
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
    const ally = (root().querySelector('#ally') as HTMLSelectElement | null)?.value
    app.allyChoice = ally ?? null
    const config = buildStageMatch(app.stage!, app.allyChoice ?? undefined)
    app.game = createMatch(config)
    app.selectedUid = null
    app.screen = 'table'
    runAiUntilHuman(app.game)
    maybeFinish()
    render()
  })
}

function identityLabel(id: string): string {
  return (
    { lord: '主公', loyal: '忠臣', rebel: '反賊', spy: '內奸', none: '' } as Record<string, string>
  )[id] ?? ''
}

function renderTable(): string {
  const g = app.game!
  const human = g.players.find((p) => p.isHuman)!
  const prompt = g.prompt
  const isHumanTurn = prompt.actorId === human.id

  return `
  <div class="screen table-screen">
    <header class="battle-top">
      <div>
        <strong>第 ${g.round} 輪</strong>
        <span class="phase">${phaseName(g.phase)}</span>
      </div>
      <div class="deck-info">牌堆 ${g.deck.length}　棄牌 ${g.discard.length}</div>
    </header>
    <div class="seats">
      ${g.players
        .map((p) => {
          const gen = getGeneral(p.generalId)
          const active = g.currentPlayer === p.id
          const targetable =
            prompt.kind === 'choose_target' && prompt.targetIds?.includes(p.id) && isHumanTurn
          return `<button type="button" class="seat ${p.alive ? '' : 'dead'} ${active ? 'active' : ''} ${p.isHuman ? 'human' : ''} ${targetable ? 'targetable' : ''}" data-seat="${p.id}" ${!targetable ? 'disabled' : ''}>
            <div class="seat-name">${escapeHtml(p.name)}${identityLabel(p.identity) ? `・${identityLabel(p.identity)}` : ''}</div>
            <div class="seat-gen">${gen.name}</div>
            <div class="hp">${hearts(p.hp, p.maxHp)}</div>
            <div class="equip">${equipText(p)}</div>
            <div class="handn">手牌 ${p.isHuman ? p.hand.length : p.hand.length}</div>
          </button>`
        })
        .join('')}
    </div>
    <div class="prompt-bar">${escapeHtml(prompt.message || '等待中…')}</div>
    <div class="log">${[...g.log]
      .slice(-8)
      .map((l) => `<div>${escapeHtml(l.text)}</div>`)
      .join('')}</div>
    <div class="hand">
      ${human.hand
        .map((c) => {
          const def = getCardDef(c.defId)
          const selectable =
            isHumanTurn &&
            (prompt.cardUids?.includes(c.uid) ||
              (prompt.kind === 'choose_card' && prompt.cardUids?.includes(c.uid)) ||
              (prompt.kind === 'discard' && prompt.cardUids?.includes(c.uid)) ||
              ((prompt.kind === 'respond_shan' || prompt.kind === 'respond_sha') &&
                prompt.cardUids?.includes(c.uid)))
          const selected = app.selectedUid === c.uid
          return `<button type="button" class="card ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''}" data-uid="${c.uid}" ${selectable ? '' : 'disabled'}>
            <span class="cname">${def.name}</span>
            <span class="ctype">${typeName(def.type)}</span>
          </button>`
        })
        .join('')}
    </div>
    <div class="actions">
      ${
        isHumanTurn && prompt.kind === 'choose_card'
          ? `<button type="button" class="btn" id="end-play">結束出牌</button>`
          : ''
      }
      ${
        isHumanTurn && (prompt.kind === 'respond_shan' || prompt.kind === 'respond_sha')
          ? `<button type="button" class="btn" id="pass-resp">放棄</button>`
          : ''
      }
      ${
        isHumanTurn && prompt.kind === 'choose_target'
          ? `<button type="button" class="btn" id="cancel-tgt">取消</button>`
          : ''
      }
      <button type="button" class="btn ghost" id="flee">退出</button>
    </div>
  </div>`
}

function hearts(hp: number, max: number): string {
  const on = Math.max(0, hp)
  return '●'.repeat(on) + '○'.repeat(Math.max(0, max - on))
}

function equipText(p: GameSnapshot['players'][0]): string {
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

function bindTable(): void {
  const g = app.game!
  const human = g.players.find((p) => p.isHuman)!

  root().querySelectorAll('.card.selectable').forEach((btn) => {
    btn.addEventListener('click', () => {
      const uid = (btn as HTMLElement).dataset.uid!
      selectCard(g, human.id, uid)
      app.selectedUid = null
      runAiUntilHuman(g)
      maybeFinish()
      render()
    })
  })

  root().querySelectorAll('.seat.targetable').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.seat)
      selectTarget(g, human.id, id)
      runAiUntilHuman(g)
      maybeFinish()
      render()
    })
  })

  root().querySelector('#end-play')?.addEventListener('click', () => {
    endPlayPhase(g, human.id)
    runAiUntilHuman(g)
    maybeFinish()
    render()
  })

  root().querySelector('#pass-resp')?.addEventListener('click', () => {
    passResponse(g, human.id)
    runAiUntilHuman(g)
    maybeFinish()
    render()
  })

  root().querySelector('#cancel-tgt')?.addEventListener('click', () => {
    cancelTarget(g, human.id)
    render()
  })

  root().querySelector('#flee')?.addEventListener('click', () => {
    app.game = null
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
