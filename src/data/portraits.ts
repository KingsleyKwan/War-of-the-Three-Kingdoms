import type { Kingdom } from '../engine/types'

const KINGDOM_COLOR: Record<Kingdom, string> = {
  wei: '#3a5a9a',
  shu: '#8b1e1e',
  wu: '#2c6b45',
  qun: '#6b5a2c',
  god: '#5a3a7a',
}

/** Stylized portrait avatar (SVG data URI) per general */
export function portraitDataUri(
  name: string,
  kingdom: Kingdom,
  gender: 'male' | 'female',
): string {
  const bg = KINGDOM_COLOR[kingdom]
  const label = name.slice(0, 1)
  const accent = gender === 'female' ? '#e8b4c4' : '#c4a35a'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <defs>
    <radialGradient id="g" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff33"/>
      <stop offset="100%" stop-color="#00000055"/>
    </radialGradient>
  </defs>
  <rect width="96" height="96" rx="10" fill="${bg}"/>
  <rect width="96" height="96" rx="10" fill="url(#g)"/>
  <circle cx="48" cy="36" r="16" fill="${accent}" opacity="0.9"/>
  <ellipse cx="48" cy="78" rx="28" ry="22" fill="${accent}" opacity="0.75"/>
  <text x="48" y="58" text-anchor="middle" font-size="28" font-family="serif" fill="#f6ecd4" font-weight="700">${label}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
