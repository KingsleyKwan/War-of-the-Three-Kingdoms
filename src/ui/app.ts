import { runAiUntilHuman } from '../ai/simple'
import { formatSeatMindHtml } from '../ai/mind'
import { getCardDef } from '../data/cards'
import {
  buildFreeMatch,
  buildStageEpilogue,
  buildStageMatch,
  CAMPAIGNS,
  findStage,
  getCampaign,
  loadCampaignProgress,
  resolveStagePacks,
  unlockNextStage,
  type CampaignStage,
} from '../data/campaigns'
import { renderCampaignMap } from '../data/campaigns/map'
import { getGeneral } from '../data/generals'
import { CARD_HELP, rankLabel, suitName, suitSymbol } from '../data/help'
import { formatPackList, PACK_DEFS } from '../data/packs'
import { portraitDataUri } from '../data/portraits'
import {
  activateSkill,
  cancelTarget,
  clearPlayFx,
  confirmGeneralPick,
  createMatch,
  endPlayPhase,
  passResponse,
  resolveChoice,
  selectCard,
  selectTarget,
} from '../engine/game'
import { listSkillActions } from '../engine/skills'
import { canReach, getDistance } from '../engine/helpers'
import type { GameSnapshot, GameMode, PlayerState, PlayFx } from '../engine/types'
import { loadSettings, saveSettings, type AppSettings } from '../persist/settings'
import { APP_VERSION } from '../version'

type Screen = 'start' | 'setup' | 'settings' | 'story' | 'stage' | 'table' | 'epilogue' | 'result'

interface AppState {
  screen: Screen
  setupMode: GameMode
  campaignId: string | null
  stage: CampaignStage | null
  allyChoice: string | null
  game: GameSnapshot | null
  selectedUid: string | null
  settings: AppSettings
  detailHtml: string | null
  aiBusy: boolean
  /** Play FX seq that already ran its enter animation (avoid remount double-play) */
  fxSettledSeq: number | null
  /** Stay on table after victory so last move is visible */
  matchEndPending: boolean
  /** User paused the match (AI and play held) */
  matchPaused: boolean
}

const app: AppState = {
  screen: 'start',
  setupMode: 'duel',
  campaignId: null,
  stage: null,
  allyChoice: null,
  game: null,
  selectedUid: null,
  settings: loadSettings(),
  detailHtml: null,
  aiBusy: false,
  fxSettledSeq: null,
  matchEndPending: false,
  matchPaused: false,
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
    case 'epilogue':
      el.innerHTML = renderEpilogue()
      bindEpilogue()
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
  const playSeq = app.game?.fx.play?.seq
  if (playSeq !== undefined) {
    requestAnimationFrame(() => {
      if (app.game?.fx.play?.seq === playSeq) app.fxSettledSeq = playSeq
    })
  } else {
    app.fxSettledSeq = null
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
      <p class="tagline">E殺風格・自由對戰與三國傳記</p>
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
  const tokenSet = !!s.aiApiToken.trim()
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
      <hr class="settings-sep" />
      <h3 class="settings-sub">卡包（自由對戰）</h3>
      <p class="hint">預設僅標準包。劇情模式會依關卡與登場武將自動啟用對應卡包。</p>
      <div class="pack-list">
        ${PACK_DEFS.map((p) => {
          const on = s.enabledPacks.includes(p.id)
          const locked = !!p.alwaysOn
          return `<label class="field check">
            <input type="checkbox" data-pack="${p.id}" ${on ? 'checked' : ''} ${locked ? 'disabled' : ''} />
            <span><strong>${p.name}</strong> — ${p.hint}${locked ? '（固定）' : ''}</span>
          </label>`
        }).join('')}
      </div>
      <hr class="settings-sep" />
      <h3 class="settings-sub">進階 AI（選填）</h3>
      <p class="hint">填入 OpenAI 相容 API Token 後，每位電腦座位會用大模型依「自己所知」決策；留空則使用內建規則 AI。</p>
      <label class="field">
        <span>AI API Token ${tokenSet ? '（已儲存）' : ''}</span>
        <input type="password" id="ai-token" placeholder="sk-... 或供應商 Token" value="${escapeHtml(s.aiApiToken)}" autocomplete="off" />
      </label>
      <label class="field">
        <span>API Base URL</span>
        <input type="text" id="ai-base" value="${escapeHtml(s.aiApiBaseUrl)}" placeholder="https://api.openai.com/v1" />
      </label>
      <label class="field">
        <span>Model</span>
        <input type="text" id="ai-model" value="${escapeHtml(s.aiModel)}" placeholder="gpt-4o-mini" />
      </label>
      <label class="field check">
        <input type="checkbox" id="ai-debug" ${s.showAiDebug ? 'checked' : ''} />
        <span>角色 ℹ 中顯示當下 AI 想法（身份推測一律可在 ℹ 查看）</span>
      </label>
      <p class="hint">身份局中點座位 ℹ 可看該角色對他人的身份推測、排除項與人數池；內奸可能伪装。</p>
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
    const enabledPacks = PACK_DEFS.filter((p) => {
      if (p.alwaysOn) return true
      const el = root().querySelector(`[data-pack="${p.id}"]`) as HTMLInputElement | null
      return !!el?.checked
    }).map((p) => p.id)
    app.settings = {
      thinkDelayMs: Number(range.value),
      showPortraits: (root().querySelector('#show-portraits') as HTMLInputElement).checked,
      forceSelectGeneral: (root().querySelector('#force-select') as HTMLInputElement).checked,
      enabledPacks,
      aiApiToken: (root().querySelector('#ai-token') as HTMLInputElement).value.trim(),
      aiApiBaseUrl:
        (root().querySelector('#ai-base') as HTMLInputElement).value.trim() ||
        'https://api.openai.com/v1',
      aiModel:
        (root().querySelector('#ai-model') as HTMLInputElement).value.trim() || 'gpt-4o-mini',
      showAiDebug: (root().querySelector('#ai-debug') as HTMLInputElement).checked,
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
      <p class="hint">卡包：${formatPackList(app.settings.enabledPacks)}（可在設定中變更；預設僅標準包）</p>
      <p class="hint">進入對局後會先看到座位與身份，再從系統隨機抽出的三名武將中選擇（可在設定改為全部可選）。</p>
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
  app.setupMode = mode
  const config = buildFreeMatch({
    mode,
    packs: app.settings.enabledPacks,
    forceSelectGeneral: app.settings.forceSelectGeneral,
  })
  app.game = createMatch(config)
  app.selectedUid = null
  app.fxSettledSeq = null
  app.matchEndPending = false
  app.matchPaused = false
  app.stage = null
  app.screen = 'table'
  render()
}

function renderStoryList(): string {
  if (!app.campaignId) {
    return `
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back>返回</button>
      <h2>劇情模式</h2>
    </header>
    <p class="story-intro">選擇傳記。關卡會依登場武將自動啟用對應卡包（風／火／林／山／一將等）。</p>
    <ul class="stage-list campaign-pick">
      ${CAMPAIGNS.map((c) => {
        const progress = loadCampaignProgress(c.id)
        const cleared = Math.min(progress - 1, c.stages.length)
        return `<li>
          <button type="button" data-campaign="${c.id}">
            <span class="idx">${escapeHtml(c.title)}</span>
            <span class="st">${escapeHtml(c.blurb)}</span>
            <span class="sub">進度 ${cleared}/${c.stages.length}</span>
          </button>
        </li>`
      }).join('')}
    </ul>
  </div>`
  }

  const campaign = getCampaign(app.campaignId)!
  const progress = loadCampaignProgress(campaign.id)
  return `
  <div class="screen panel-screen">
    <header class="topbar">
      <button type="button" class="btn ghost" data-back-campaigns>傳記列表</button>
      <h2>劇情・${escapeHtml(campaign.title)}</h2>
    </header>
    <p class="story-intro">${escapeHtml(campaign.blurb)}</p>
    <ul class="stage-list">
      ${campaign.stages
        .map((s) => {
          const locked = s.index > progress
          return `<li class="${locked ? 'locked' : ''}">
          <button type="button" data-stage="${s.id}" ${locked ? 'disabled' : ''}>
            <span class="idx">第${s.index}關</span>
            <span class="st">${s.title}</span>
            <span class="sub">${s.subtitle}・${s.era}</span>
            ${locked ? '<span class="lock">未解鎖</span>' : ''}
          </button>
        </li>`
        })
        .join('')}
    </ul>
  </div>`
}

function bindStoryList(): void {
  root().querySelector('[data-back]')?.addEventListener('click', () => {
    app.screen = 'start'
    render()
  })
  root().querySelector('[data-back-campaigns]')?.addEventListener('click', () => {
    app.campaignId = null
    render()
  })
  root().querySelectorAll('[data-campaign]').forEach((btn) => {
    btn.addEventListener('click', () => {
      app.campaignId = (btn as HTMLElement).dataset.campaign!
      render()
    })
  })
  root().querySelectorAll('[data-stage]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.stage!
      const found = findStage(id)
      app.stage = found?.stage ?? null
      app.campaignId = found?.campaign.id ?? app.campaignId
      app.allyChoice = app.stage?.allyChoices?.[0] ?? null
      app.screen = 'stage'
      render()
    })
  })
}

function renderStageBrief(): string {
  const s = app.stage!
  const choices = s.allyChoices ?? []
  const storyHtml = escapeHtml(s.briefing)
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('')
  const linkHtml = s.prevLink
    ? `<p class="story-bridge">${escapeHtml(s.prevLink)}</p>`
    : ''

  const fixedAllies = s.allies.map((a) => {
    if (a.name) return a.name
    return getGeneral(a.generalId).name
  })
  const enemyNames = s.enemies.map((e) => e.name ?? getGeneral(e.generalId).name)
  const heroName = getGeneral(s.playerGeneralId).name

  const forcesHtml = `
    <section class="intel-block">
      <h4>參戰勢力</h4>
      <div class="force-cols">
        <div>
          <p class="force-side">我方</p>
          <ul class="force-list">
            <li>${escapeHtml(heroName)}</li>
            ${fixedAllies.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
            ${choices.length ? '<li class="force-pick">＋自選副將</li>' : ''}
          </ul>
        </div>
        <div>
          <p class="force-side foe">敵方</p>
          <ul class="force-list">
            ${enemyNames.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}
          </ul>
        </div>
      </div>
    </section>
    <section class="intel-block">
      <h4>關卡設定</h4>
      <p class="intel-pack">卡包：${formatPackList(resolveStagePacks(s))}${
        s.requiredCardKinds?.length
          ? `　·　必備：${s.requiredCardKinds
              .map((k) => (k === 'tiesuo' ? '鐵索連環' : k))
              .join('、')}`
          : ''
      }</p>
      <p class="intel-pack">勝利：${
        s.victory.type === 'kill_target'
          ? `擊殺 ${getGeneral(s.victory.targetGeneralId!).name}`
          : '殲滅敵軍'
      }</p>
    </section>`

  const mapHtml = renderCampaignMap({
    title: s.title,
    era: s.era,
    battlefieldCityId: s.battlefieldCityId,
    cityFactions: s.cityFactions,
    movements: s.movements,
    visibleCityIds: s.visibleCityIds,
    intelExtraHtml: forcesHtml,
  })
  return `
  <div class="screen story-brief-screen">
    <header class="topbar story-brief-top">
      <button type="button" class="btn ghost" data-back>返回</button>
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${escapeHtml(s.era)}・第${s.index}關</p>
        <h2>${s.title}</h2>
        <p class="story-brief-sub">${escapeHtml(s.subtitle)}</p>
      </div>
    </header>
    ${mapHtml}
    <div class="story-brief-lower">
      <div class="story-scroll" aria-label="關卡劇情">
        <div class="story-hand">${linkHtml}${storyHtml}</div>
      </div>
      <div class="panel story-ready">
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
            : '<p class="meta">確認戰局後進入戰鬥</p>'
        }
        <button type="button" class="btn primary" id="enter-stage">下一步</button>
      </div>
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
  app.fxSettledSeq = null
  app.matchEndPending = false
  app.matchPaused = false
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

function renderMatchEndOverlay(g: GameSnapshot): string {
  const humanWin = g.winnerIds!.includes(0)
  return `<div class="match-end-overlay" role="dialog" aria-modal="true" aria-labelledby="match-end-title">
    <div class="match-end-card">
      <p class="match-end-kicker">${humanWin ? '我方勝' : '敵方勝'}</p>
      <h2 id="match-end-title">${humanWin ? '勝利' : '敗北'}</h2>
      <p class="match-end-msg">${escapeHtml(g.resultMessage ?? '')}</p>
      <button type="button" class="btn primary" id="ack-match-end">下一步</button>
    </div>
  </div>`
}

function renderTable(): string {
  const g = app.game!
  const human = g.players.find((p) => p.isHuman)!
  const prompt = g.prompt
  const picking = g.matchPhase === 'pick_general'
  const matchEnded = !!g.winnerIds
  const isHumanTurn =
    prompt.actorId === human.id && !app.aiBusy && !picking && !matchEnded && !app.matchPaused
  const n = g.players.length
  const thinking =
    !matchEnded &&
    !app.matchPaused &&
    app.aiBusy &&
    prompt.actorId !== null &&
    !g.players[prompt.actorId]?.isHuman
      ? `<div class="thinking">${escapeHtml(g.players[prompt.actorId].name)} 思考中…</div>`
      : app.matchPaused
        ? `<div class="thinking paused-banner">對局已暫停</div>`
        : ''

  return `
  <div class="screen table-screen ${matchEnded ? 'match-ended' : ''} ${app.matchPaused ? 'match-paused' : ''}">
    <header class="battle-top">
      <div>
        <strong>${picking ? '選將階段' : `第 ${g.round} 輪`}</strong>
        <span class="phase">${picking ? '請選擇武將' : phaseName(g.phase)}</span>
      </div>
      <div class="battle-top-right">
        <div class="deck-info">${picking ? `座位 ${n} 人` : `牌堆 ${g.deck.length}　棄牌 ${g.discard.length}`}</div>
        ${
          !matchEnded
            ? `<button type="button" class="btn ghost" id="pause-match">${app.matchPaused ? '繼續' : '暫停'}</button>`
            : ''
        }
      </div>
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
              : String(getDistance(g, human.id, p.id))
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
    ${!picking && (prompt.kind === 'choice' || prompt.kind === 'skill_cards') ? renderChoicePanel(g) : ''}
    ${
      !picking && isHumanTurn && prompt.kind === 'choose_card'
        ? `<div class="skill-row">${listSkillActions(g, human.id)
            .map(
              (a) =>
                `<button type="button" class="btn ghost" data-skill="${a.id}" title="${escapeHtml(a.hint)}">${escapeHtml(a.label)}</button>`,
            )
            .join('')}</div>`
        : ''
    }
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
              prompt.kind === 'respond_sha' ||
              prompt.kind === 'skill_cards')
          const selected =
            app.selectedUid === c.uid ||
            (prompt.kind === 'skill_cards' && !!prompt.selectedCardUids?.includes(c.uid))
          const red = def.suit === 'heart' || def.suit === 'diamond'
          return `<div class="card-wrap">
            <button type="button" class="card ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''} ${red ? 'red' : 'black'}" data-uid="${c.uid}" ${selectable ? '' : 'disabled'}>
              <span class="csuit ${red ? 'red' : ''}">${suitSymbol(def.suit)}${rankLabel(def.rank)}</span>
              <span class="cname">${def.name}</span>
              <span class="ctype">${cardSubLabel(def)}</span>
            </button>
            <button type="button" class="info-btn card-info" data-info-card="${c.uid}" title="牌面說明">ℹ</button>
          </div>`
        })
        .join('')}
    </div>`
    }
    <div class="actions">
      <div class="actions-main">
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
        !picking &&
        isHumanTurn &&
        (prompt.kind === 'choose_target' ||
          prompt.kind === 'skill_cards' ||
          (prompt.kind === 'choice' &&
            (prompt.choiceKey === 'fangtian_confirm' ||
              prompt.choiceKey === 'rende_target' ||
              prompt.choiceKey === 'zhangba_target')))
          ? `<button type="button" class="btn" id="cancel-tgt">取消</button>`
          : ''
      }
      </div>
      <div class="actions-quit">
        <button type="button" class="btn ghost danger" id="flee">退出對局</button>
      </div>
    </div>
    ${matchEnded ? renderMatchEndOverlay(g) : ''}
  </div>`
}

function renderChoicePanel(g: GameSnapshot): string {
  const choices = g.prompt.choices ?? []
  if (!choices.length) return ''
  const skillPick = g.prompt.kind === 'skill_cards'
  const zonePick = g.prompt.choiceKey === 'zone_pick'
  const selected = g.prompt.selectedCardUids?.length ?? 0
  const min = g.prompt.minTargets ?? 1
  return `<div class="choice-panel">
    <h3>${escapeHtml(g.prompt.message)}</h3>
    <div class="choice-row">
      ${choices
        .map((c) => {
          const disabled =
            (skillPick || zonePick) && c.id === 'confirm' && selected < min
          const picked = zonePick && !!g.prompt.selectedCardUids?.includes(c.id)
          const cls = [
            'btn',
            c.id === 'skip' || c.id === 'no' ? 'ghost' : 'primary',
            picked ? 'selected-pick' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return `<button type="button" class="${cls}" data-choice="${c.id}" ${disabled ? 'disabled' : ''}>${escapeHtml(c.label)}</button>`
        })
        .join('')}
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

  const settled = !!(play && app.fxSettledSeq === play.seq)
  const src = play ? seatPoint(play.sourceId, humanId, n) : null
  const arrows =
    play && src
      ? play.targetIds
          .filter((tid) => tid !== play.sourceId)
          .map((tid) => {
            const dst = seatPoint(tid, humanId, n)
            return arrowLine(src.x, src.y, dst.x, dst.y, play.seq, settled)
          })
          .join('')
      : ''

  const selfTarget =
    play && play.targetIds.length === 1 && play.targetIds[0] === play.sourceId
      ? `<div class="fx-self-ring ${settled ? 'fx-settled' : ''}" style="left:${src!.x}%;top:${src!.y}%"></div>`
      : ''

  const red = play && (play.suit === 'heart' || play.suit === 'diamond')
  const cardHtml = play
    ? `<div class="fx-card ${red ? 'red' : 'black'} ${settled ? 'fx-settled' : ''}" data-fx-seq="${play.seq}">
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

function arrowLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  seq: number,
  settled = false,
): string {
  // Shorten so arrow tips sit near seats, not under card center
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const inset = Math.min(8, len * 0.2)
  const sx = x1 + (dx / len) * inset
  const sy = y1 + (dy / len) * inset
  const ex = x2 - (dx / len) * inset
  const ey = y2 - (dy / len) * inset
  return `<line class="fx-arrow-line ${settled ? 'fx-settled' : ''}" data-fx-seq="${seq}" x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" marker-end="url(#arrowHead)" />`
}

function hearts(hp: number, max: number): string {
  const on = Math.max(0, hp)
  return '●'.repeat(on) + '○'.repeat(Math.max(0, max - on))
}

function equipText(p: PlayerState): string {
  const lines: string[] = []
  if (p.equips.weapon) {
    const def = getCardDef(p.equips.weapon.defId)
    const range = def.attackRange ?? 1
    lines.push(
      `<span class="eq-line eq-weapon">${escapeHtml(def.name)} <em>攻${range}</em></span>`,
    )
  }
  if (p.equips.armor) {
    const def = getCardDef(p.equips.armor.defId)
    lines.push(`<span class="eq-line eq-armor">${escapeHtml(def.name)}</span>`)
  }
  if (p.equips.horseMinus) {
    const def = getCardDef(p.equips.horseMinus.defId)
    lines.push(`<span class="eq-line eq-horse">-1 ${escapeHtml(def.name)}</span>`)
  }
  if (p.equips.horsePlus) {
    const def = getCardDef(p.equips.horsePlus.defId)
    lines.push(`<span class="eq-line eq-horse">+1 ${escapeHtml(def.name)}</span>`)
  }
  for (const j of p.judges ?? []) {
    const def = getCardDef(j.defId)
    lines.push(`<span class="eq-line eq-judge">判定・${escapeHtml(def.name)}</span>`)
  }
  return lines.length ? lines.join('') : '無裝備'
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

/** Hand-card footer: weapon range / horse +/-1 / type */
function cardSubLabel(def: ReturnType<typeof getCardDef>): string {
  if (def.slot === 'weapon') return `武器・攻${def.attackRange ?? 1}`
  if (def.slot === 'armor') return '防具'
  if (def.slot === 'horseMinus') return '-1坐騎'
  if (def.slot === 'horsePlus') return '+1坐騎'
  return typeName(def.type)
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
      let tag = ''
      if (slot === 'weapon') tag = `攻擊範圍 ${def.attackRange ?? 1}`
      else if (slot === 'horseMinus') tag = '-1 坐騎（與其他角色距離-1）'
      else if (slot === 'horsePlus') tag = '+1 坐騎（其他角色與你距離+1）'
      else if (slot === 'armor') tag = '防具'
      return `<li><strong>${escapeHtml(def.name)}</strong>（${suitName(def.suit)}${rankLabel(def.rank)}）· ${tag}<br/><span class="muted">${CARD_HELP[def.kind] ?? ''}</span></li>`
    })
    .filter(Boolean)
    .join('')

  const g = app.game
  let mindHtml = ''
  if (g && (g.config.mode === 'identity5' || g.config.mode === 'identity8')) {
    mindHtml = formatSeatMindHtml(g, p.id)
    // Hide live "thought" unless debug toggle on
    if (!app.settings.showAiDebug) {
      mindHtml = mindHtml.replace(/<p class="mind-thought">[\s\S]*?<\/p>/, '')
    }
  }

  const idVisible =
    g &&
    (() => {
      const human = g.players.find((x) => x.isHuman)
      if (!human) return ''
      const label = identityLabelVisible(p, human, g.config.mode)
      return label ? `<p class="muted">公開身份資訊：${label}</p>` : ''
    })()

  return `<h3>${gen.name}</h3>
    <p class="muted">${kingdomName(gen.kingdom)}・${gen.maxHp} 血・${gen.gender === 'female' ? '女' : '男'}・${escapeHtml(p.name)}</p>
    ${idVisible ?? ''}
    <h4>武將技</h4>
    <p>${escapeHtml(gen.skillText)}</p>
    <h4>裝備</h4>
    ${equips ? `<ul class="detail-list">${equips}</ul>` : '<p class="muted">無</p>'}
    ${mindHtml}`
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
    <p>${suitSymbol(def.suit)} ${suitName(def.suit)} ${rankLabel(def.rank)}　·　${cardSubLabel(def)}</p>
    <p>${CARD_HELP[def.kind] ?? '暫無說明。'}</p>`
}

async function continueAi(): Promise<void> {
  const g = app.game
  if (!g || app.aiBusy || app.matchPaused) return
  if (g.matchPhase === 'pick_general') return
  // Brief pause after action so card FX is visible, then clear when resolved
  if (g.fx.play || g.fx.damages.length) {
    app.aiBusy = true
    render()
    const hold = Math.min(Math.max(app.settings.thinkDelayMs, 500), 1000)
    await new Promise((r) => setTimeout(r, hold))
    if (app.matchPaused) {
      app.aiBusy = false
      render()
      return
    }
    if (isEffectResolved(g) && !g.winnerIds) clearPlayFx(g)
    app.aiBusy = false
    render()
  }
  if (g.winnerIds) {
    maybeFinish()
    render()
    return
  }
  if (app.matchPaused) return
  app.aiBusy = true
  render()
  try {
    await runAiUntilHuman(
      g,
      () => {
        if (app.screen === 'table' && app.game === g) render()
      },
      () => app.matchPaused,
    )
  } finally {
    app.aiBusy = false
  }
  if (app.matchPaused) {
    render()
    return
  }
  // Keep last-move FX visible when the match just ended
  if (isEffectResolved(g) && !g.winnerIds) clearPlayFx(g)
  maybeFinish()
  render()
}

function isEffectResolved(g: GameSnapshot): boolean {
  const k = g.prompt.kind
  return (
    k === 'choose_card' ||
    k === 'discard' ||
    k === 'game_over' ||
    k === 'idle' ||
    k === 'choose_general'
  )
}

function bindTable(): void {
  const g = app.game!
  const human = g.players.find((p) => p.isHuman)!

  root().querySelectorAll('[data-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (
        app.aiBusy ||
        (g.prompt.kind !== 'choice' && g.prompt.kind !== 'skill_cards') ||
        g.prompt.actorId !== human.id
      )
        return
      const id = (btn as HTMLElement).dataset.choice!
      resolveChoice(g, human.id, id)
      void continueAi()
    })
  })

  root().querySelectorAll('[data-skill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (app.aiBusy || g.prompt.kind !== 'choose_card' || g.prompt.actorId !== human.id) return
      const id = (btn as HTMLElement).dataset.skill!
      activateSkill(g, human.id, id)
      app.selectedUid = null
      void continueAi()
    })
  })

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
      // Skill multi-card pick: toggle selection
      if (g.prompt.kind === 'skill_cards') {
        selectCard(g, human.id, uid)
        render()
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

  root().querySelector('#ack-match-end')?.addEventListener('click', () => {
    app.matchEndPending = false
    app.screen = app.stage ? 'epilogue' : 'result'
    render()
  })

  root().querySelector('#pause-match')?.addEventListener('click', () => {
    if (app.matchPaused) {
      app.matchPaused = false
      render()
      void continueAi()
      return
    }
    app.matchPaused = true
    render()
  })

  root().querySelector('#flee')?.addEventListener('click', () => {
    if (!window.confirm('確定要退出對局嗎？進度不會保存。')) return
    app.game = null
    app.aiBusy = false
    app.matchEndPending = false
    app.matchPaused = false
    app.screen = app.stage ? 'story' : 'start'
    render()
  })
}

function maybeFinish(): void {
  const g = app.game
  if (!g?.winnerIds) {
    app.matchEndPending = false
    return
  }
  if (!app.matchEndPending) {
    if (g.config.campaignStageId && g.winnerIds.includes(0)) {
      const found = findStage(g.config.campaignStageId)
      if (found) unlockNextStage(found.campaign.id, found.stage.index)
    }
    app.matchEndPending = true
  }
  // Stay on the table so the last move remains visible; result opens on 「下一步」
}

function renderEpilogue(): string {
  const s = app.stage!
  const g = app.game!
  const won = !!g.winnerIds?.includes(0)
  const text = buildStageEpilogue(s, g)
  const storyHtml = escapeHtml(text)
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('')
  const mapHtml = renderCampaignMap({
    title: s.title,
    era: s.era,
    battlefieldCityId: s.battlefieldCityId,
    cityFactions: s.cityFactions,
    movements: s.movements,
    visibleCityIds: s.visibleCityIds,
  })
  return `
  <div class="screen story-brief-screen epilogue-screen">
    <header class="topbar story-brief-top">
      <div class="story-brief-titles">
        <p class="story-brief-kicker">${won ? '戰後・勝' : '戰後・敗'}・${escapeHtml(s.era)}</p>
        <h2>${s.title}</h2>
      </div>
    </header>
    ${mapHtml}
    <div class="story-brief-lower">
      <div class="story-scroll" aria-label="戰後劇情">
        <div class="story-hand">${storyHtml}</div>
      </div>
      <div class="panel story-ready">
        <button type="button" class="btn primary" id="epilogue-next">下一步</button>
      </div>
    </div>
  </div>`
}

function bindEpilogue(): void {
  root().querySelector('#epilogue-next')?.addEventListener('click', () => {
    app.screen = 'result'
    render()
  })
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
