/** Simplified late-Han map coordinates (percent of viewBox). */

export interface CampaignCity {
  id: string
  name: string
  x: number
  y: number
}

export interface MapMovement {
  fromCityId: string
  toCityId: string
  actor: string
  note?: string
}

export const CAMPAIGN_CITIES: Record<string, CampaignCity> = {
  changan: { id: 'changan', name: '長安', x: 28, y: 48 },
  luoyang: { id: 'luoyang', name: '洛陽', x: 42, y: 44 },
  sishui: { id: 'sishui', name: '汜水關', x: 48, y: 40 },
  hulao: { id: 'hulao', name: '虎牢關', x: 52, y: 46 },
  yingchuan: { id: 'yingchuan', name: '潁川', x: 50, y: 58 },
  xuchang: { id: 'xuchang', name: '許昌', x: 54, y: 54 },
  puyang: { id: 'puyang', name: '濮陽', x: 58, y: 38 },
  yanzhou: { id: 'yanzhou', name: '兗州', x: 62, y: 42 },
  xuzhou: { id: 'xuzhou', name: '徐州', x: 72, y: 48 },
  wancheng: { id: 'wancheng', name: '宛城', x: 46, y: 68 },
  guandu: { id: 'guandu', name: '官渡', x: 56, y: 36 },
  ye: { id: 'ye', name: '鄴城', x: 58, y: 26 },
  chibi: { id: 'chibi', name: '赤壁', x: 58, y: 78 },
  chaisang: { id: 'chaisang', name: '柴桑', x: 68, y: 82 },
  xinye: { id: 'xinye', name: '新野', x: 48, y: 72 },
  jingzhou: { id: 'jingzhou', name: '荊州', x: 52, y: 74 },
  chengdu: { id: 'chengdu', name: '成都', x: 22, y: 78 },
  hanzhong: { id: 'hanzhong', name: '漢中', x: 32, y: 62 },
  dingjun: { id: 'dingjun', name: '定軍山', x: 30, y: 66 },
}

export const FACTION_COLORS: Record<string, string> = {
  黃巾: '#6b8f3a',
  漢廷: '#c4a35a',
  董卓: '#8b3a3a',
  曹操: '#3d6b8a',
  呂布: '#7a4a8a',
  袁紹: '#8a6b3d',
  張繡: '#8a5a3d',
  孫權: '#2c6b4a',
  孫堅: '#2c6b4a',
  孫策: '#2c6b4a',
  劉備: '#8b3a3a',
  劉表: '#6b5a3a',
  聯軍: '#5a6a7a',
  未定: '#5a5348',
}

export function getCity(id: string): CampaignCity {
  const c = CAMPAIGN_CITIES[id]
  if (!c) throw new Error(`Unknown city ${id}`)
  return c
}

export interface CampaignMapOpts {
  title: string
  era: string
  battlefieldCityId: string
  cityFactions: Record<string, string>
  movements: MapMovement[]
  visibleCityIds?: string[]
  /** Extra HTML for the intel column (forces, packs, etc.) */
  intelExtraHtml?: string
}

/** Full-width theater: large map + side intel panels */
export function renderCampaignMap(opts: CampaignMapOpts): string {
  const visible = new Set(
    opts.visibleCityIds ??
      Object.keys(opts.cityFactions).concat(
        opts.battlefieldCityId,
        ...opts.movements.flatMap((m) => [m.fromCityId, m.toCityId]),
      ),
  )
  const cities = [...visible]
    .map((id) => CAMPAIGN_CITIES[id])
    .filter(Boolean) as CampaignCity[]

  const markers = cities
    .map((c) => {
      const faction = opts.cityFactions[c.id] ?? '未定'
      const color = FACTION_COLORS[faction] ?? FACTION_COLORS['未定']
      const isBattle = c.id === opts.battlefieldCityId
      return `
      <g class="map-city ${isBattle ? 'battle' : ''}" data-city="${c.id}">
        <circle cx="${c.x}" cy="${c.y}" r="${isBattle ? 3.2 : 2.2}" fill="${color}" stroke="${isBattle ? '#f3e6c8' : 'rgba(243,230,200,0.45)'}" stroke-width="${isBattle ? 0.7 : 0.35}" />
        <text x="${c.x}" y="${c.y - 4.2}" text-anchor="middle" class="map-city-name">${c.name}</text>
        <text x="${c.x}" y="${c.y + 5.8}" text-anchor="middle" class="map-city-faction">${faction}</text>
      </g>`
    })
    .join('')

  const arrows = opts.movements
    .map((m, i) => {
      const from = getCity(m.fromCityId)
      const to = getCity(m.toCityId)
      const mx = (from.x + to.x) / 2
      const my = (from.y + to.y) / 2 - 2
      const label = m.note ? `${m.actor}・${m.note}` : m.actor
      return `
      <g class="map-move" style="--i:${i}">
        <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="map-arrow-line" marker-end="url(#map-arrowhead)" />
        <text x="${mx}" y="${my}" text-anchor="middle" class="map-move-label">${label}</text>
      </g>`
    })
    .join('')

  const battle = getCity(opts.battlefieldCityId)
  const battleFaction = opts.cityFactions[opts.battlefieldCityId] ?? '未定'

  const factionRows = cities
    .map((c) => {
      const faction = opts.cityFactions[c.id] ?? '未定'
      const color = FACTION_COLORS[faction] ?? FACTION_COLORS['未定']
      const isBattle = c.id === opts.battlefieldCityId
      return `<li class="${isBattle ? 'is-battle' : ''}">
        <span class="faction-dot" style="background:${color}"></span>
        <span class="faction-city">${c.name}</span>
        <span class="faction-owner">${faction}</span>
        ${isBattle ? '<span class="faction-tag">戰場</span>' : ''}
      </li>`
    })
    .join('')

  const moveRows = opts.movements
    .map(
      (m) =>
        `<li>
          <strong>${m.actor}</strong>
          <span class="move-path">${getCity(m.fromCityId).name} → ${getCity(m.toCityId).name}</span>
          ${m.note ? `<span class="move-note">${m.note}</span>` : ''}
        </li>`,
    )
    .join('')

  return `
  <div class="campaign-theater">
    <div class="campaign-map-pane">
      <svg class="campaign-map" viewBox="0 0 100 100" role="img" aria-label="${opts.title}戰略圖" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="map-arrowhead" markerWidth="5" markerHeight="5" refX="4.2" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5 Z" fill="#e8c56a" />
          </marker>
          <linearGradient id="map-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2a2118"/>
            <stop offset="100%" stop-color="#1a140e"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#map-land)" rx="1.5" />
        <path class="map-river" d="M18,30 Q35,38 48,52 T72,70" fill="none" />
        ${arrows}
        ${markers}
      </svg>
    </div>
    <aside class="campaign-intel" aria-label="戰局情報">
      <header class="intel-head">
        <p class="intel-kicker">戰局情報</p>
        <h3>${opts.title}</h3>
      </header>
      <dl class="intel-facts">
        <div><dt>年代</dt><dd>${opts.era}</dd></div>
        <div><dt>戰場</dt><dd>${battle.name}</dd></div>
        <div><dt>城屬</dt><dd>${battleFaction}</dd></div>
      </dl>
      <section class="intel-block">
        <h4>城池勢力</h4>
        <ul class="faction-list">${factionRows}</ul>
      </section>
      <section class="intel-block">
        <h4>行軍動向</h4>
        <ul class="map-legend">${moveRows}</ul>
      </section>
      ${opts.intelExtraHtml ?? ''}
    </aside>
  </div>`
}
