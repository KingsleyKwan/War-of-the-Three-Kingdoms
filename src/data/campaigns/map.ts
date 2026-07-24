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
  聯軍: '#5a6a7a',
  未定: '#5a5348',
}

export function getCity(id: string): CampaignCity {
  const c = CAMPAIGN_CITIES[id]
  if (!c) throw new Error(`Unknown city ${id}`)
  return c
}

/** Inline SVG campaign map for a stage */
export function renderCampaignMap(opts: {
  title: string
  era: string
  battlefieldCityId: string
  cityFactions: Record<string, string>
  movements: MapMovement[]
  visibleCityIds?: string[]
}): string {
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

  return `
  <div class="campaign-map-wrap">
    <div class="campaign-map-meta">
      <span class="map-era">${opts.era}</span>
      <span class="map-battle">戰場：${battle.name}（${battleFaction}）</span>
    </div>
    <svg class="campaign-map" viewBox="0 0 100 100" role="img" aria-label="${opts.title}戰略圖">
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
    <ul class="map-legend">
      ${opts.movements
        .map(
          (m) =>
            `<li><strong>${m.actor}</strong>：${getCity(m.fromCityId).name} → ${getCity(m.toCityId).name}${m.note ? `（${m.note}）` : ''}</li>`,
        )
        .join('')}
    </ul>
  </div>`
}
