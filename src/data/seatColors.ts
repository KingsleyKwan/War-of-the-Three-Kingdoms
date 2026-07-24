/** Stable distinct colors per seat index (supports up to 8+ identity seats). */
const SEAT_PALETTE = [
  '#e8a54b', // amber — often human / seat 0
  '#6ec6ff', // sky
  '#9ad67a', // green
  '#e87a9a', // rose
  '#c4a0ff', // violet
  '#7ad4c0', // teal
  '#f0c86a', // gold
  '#ff9e6b', // coral
] as const

export function seatColor(seatId: number): string {
  const i = ((seatId % SEAT_PALETTE.length) + SEAT_PALETTE.length) % SEAT_PALETTE.length
  return SEAT_PALETTE[i]
}

export function seatRefHtml(label: string, seatId: number): string {
  const color = seatColor(seatId)
  return `<span class="seat-ref" style="--seat-c:${color}" data-seat="${seatId}">${escapeHtml(label)}</span>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type NamedSeat = {
  id: number
  name: string
  /** Optional general display name */
  generalName?: string
}

/**
 * Color every seat name / general name that appears in plain log text.
 * Longer labels first so 「臥龍諸葛亮」 beats shorter overlaps.
 */
export function colorizeSeatNamesInText(text: string, seats: NamedSeat[]): string {
  type Hit = { label: string; id: number }
  const hits: Hit[] = []
  const seen = new Set<string>()
  for (const s of seats) {
    for (const label of [s.name, s.generalName]) {
      const t = label?.trim()
      if (!t || seen.has(t)) continue
      seen.add(t)
      hits.push({ label: t, id: s.id })
    }
  }
  hits.sort((a, b) => b.label.length - a.label.length)

  let out = escapeHtml(text)
  const parts: string[] = []
  for (const h of hits) {
    const esc = escapeHtml(h.label)
    if (!esc) continue
    const re = new RegExp(esc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    const token = `\uE000${parts.length}\uE001`
    if (!re.test(out)) continue
    re.lastIndex = 0
    out = out.replace(re, token)
    parts.push(seatRefHtml(h.label, h.id))
  }
  for (let i = 0; i < parts.length; i++) {
    out = out.split(`\uE000${i}\uE001`).join(parts[i])
  }
  return out
}
