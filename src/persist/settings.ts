export interface AppSettings {
  /** Milliseconds of AI “thinking” between actions */
  thinkDelayMs: number
  /** Show character portrait avatars */
  showPortraits: boolean
  /** Free play: pick any general instead of random 3 */
  forceSelectGeneral: boolean
  /**
   * Card / general packs enabled for free play.
   * Standard is always included. Default: standard only.
   */
  enabledPacks: Array<'standard' | 'ex'>
  /** Optional OpenAI-compatible API token for LLM-controlled AI seats */
  aiApiToken: string
  /** API base URL (OpenAI-compatible), e.g. https://api.openai.com/v1 */
  aiApiBaseUrl: string
  /** Model id for chat completions */
  aiModel: string
  /** Show each AI seat’s identity guesses / thoughts during match */
  showAiDebug: boolean
}

const KEY = 'wtk_settings_v1'

const DEFAULTS: AppSettings = {
  thinkDelayMs: 1000,
  showPortraits: true,
  forceSelectGeneral: false,
  enabledPacks: ['standard'],
  aiApiToken: '',
  aiApiBaseUrl: 'https://api.openai.com/v1',
  aiModel: 'gpt-4o-mini',
  showAiDebug: false,
}

function normalizeEnabledPacks(raw: unknown): AppSettings['enabledPacks'] {
  const allowed = new Set(['standard', 'ex'])
  const list = Array.isArray(raw)
    ? raw.filter((p): p is 'standard' | 'ex' => typeof p === 'string' && allowed.has(p))
    : []
  const set = new Set(list)
  set.add('standard')
  return (['standard', 'ex'] as const).filter((id) => set.has(id))
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS, enabledPacks: [...DEFAULTS.enabledPacks] }
    const parsed = JSON.parse(raw) as Partial<AppSettings> & { useEx?: boolean }
    // Migrate legacy free-play checkbox if packs not stored yet
    let packs = parsed.enabledPacks
    if (!packs && parsed.useEx === true) packs = ['standard', 'ex']
    return {
      thinkDelayMs: clamp(
        Number(parsed.thinkDelayMs ?? DEFAULTS.thinkDelayMs),
        0,
        5000,
      ),
      showPortraits: parsed.showPortraits ?? DEFAULTS.showPortraits,
      forceSelectGeneral: parsed.forceSelectGeneral ?? DEFAULTS.forceSelectGeneral,
      enabledPacks: normalizeEnabledPacks(packs ?? DEFAULTS.enabledPacks),
      aiApiToken: typeof parsed.aiApiToken === 'string' ? parsed.aiApiToken : '',
      aiApiBaseUrl:
        typeof parsed.aiApiBaseUrl === 'string' && parsed.aiApiBaseUrl.trim()
          ? parsed.aiApiBaseUrl.trim()
          : DEFAULTS.aiApiBaseUrl,
      aiModel:
        typeof parsed.aiModel === 'string' && parsed.aiModel.trim()
          ? parsed.aiModel.trim()
          : DEFAULTS.aiModel,
      showAiDebug: parsed.showAiDebug ?? DEFAULTS.showAiDebug,
    }
  } catch {
    return { ...DEFAULTS, enabledPacks: [...DEFAULTS.enabledPacks] }
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...s, enabledPacks: normalizeEnabledPacks(s.enabledPacks) }),
  )
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}
