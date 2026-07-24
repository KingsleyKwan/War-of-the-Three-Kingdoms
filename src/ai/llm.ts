import type { GameSnapshot } from '../engine/types'
import { getGeneral } from '../data/generals'
import { getCardDef } from '../data/cards'
import { loadSettings } from '../persist/settings'
import {
  applyBeliefUpdates,
  ensureAiMind,
  handSummaryForPrompt,
  identityGuessLabel,
  knownIdentity,
  setSeatThought,
  type IdentityGuess,
} from './mind'

export interface LlmDecision {
  action:
    | 'play_card'
    | 'end_play'
    | 'select_target'
    | 'respond_card'
    | 'pass'
    | 'choice'
    | 'skill'
    | 'confirm'
    | 'pick_card'
  cardUid?: string
  targetId?: number
  choiceId?: string
  skillId?: string
  thought?: string
  beliefs?: Record<string, { guess: IdentityGuess; note?: string }>
}

function stripCodeFence(text: string): string {
  const t = text.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  return m ? m[1].trim() : t
}

export async function requestLlmDecision(
  state: GameSnapshot,
  playerId: number,
): Promise<LlmDecision | null> {
  const s = loadSettings()
  const token = s.aiApiToken.trim()
  if (!token) return null

  const base = (s.aiApiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = s.aiModel.trim() || 'gpt-4o-mini'
  const p = state.players[playerId]
  const minds = ensureAiMind(state)
  const mind = minds[playerId]

  const others = state.players
    .filter((o) => o.id !== playerId)
    .map((o) => {
      const known = knownIdentity(state, playerId, o.id)
      const belief = mind?.beliefs[o.id]
      const gen = o.generalId ? getGeneral(o.generalId).name : '未亮將'
      const skills = o.generalId ? getGeneral(o.generalId).skillText : ''
      return {
        id: o.id,
        name: o.name,
        general: gen,
        hp: `${o.hp}/${o.maxHp}`,
        handCount: o.hand.length,
        alive: o.alive,
        equips: Object.values(o.equips)
          .filter(Boolean)
          .map((c) => getCardDef(c!.defId).name),
        knownIdentity: identityGuessLabel(known),
        myGuess: belief ? identityGuessLabel(belief.guess) : '未知',
        guessNote: belief?.note ?? '',
        skills,
      }
    })

  const prompt = state.prompt
  const legal = {
    kind: prompt.kind,
    message: prompt.message,
    cardUids: prompt.cardUids ?? [],
    targetIds: prompt.targetIds ?? [],
    choices: prompt.choices ?? [],
    skillId: prompt.skillId,
    selectedCardUids: prompt.selectedCardUids ?? [],
    minTargets: prompt.minTargets,
    maxTargets: prompt.maxTargets,
  }

  const myGen = p.generalId ? getGeneral(p.generalId) : null
  const system = `You are an AI playing 三國殺 (War of the Three Kingdoms) as one seat.
Rules of knowledge:
- You KNOW your own identity. You see 主公 identity. Other living identities are hidden unless dead.
- Infer others from behaviour (who attacks 主公 → likely 反賊/內奸; who attacks rebels → likely 忠臣).
- Never attack believed teammates. 內奸 trusts nobody.
Skill care:
- 張角 雷擊: when he plays 閃 against 殺, he can thunder someone. If he still has hand cards, attacking him is dangerous. Teammates must NEVER attack him. If he has 0 hand cards, 雷擊 is hard to trigger — still do not attack teammates.
- Prefer legal options only from the provided prompt.
Return ONLY compact JSON:
{"action":"play_card|end_play|select_target|respond_card|pass|choice|skill|confirm|pick_card","cardUid":"...","targetId":0,"choiceId":"...","skillId":"...","thought":"...","beliefs":{"2":{"guess":"rebel|loyal|spy|unknown","note":"..."}}}`

  const user = JSON.stringify(
    {
      me: {
        id: p.id,
        name: p.name,
        identity: p.identity,
        general: myGen?.name,
        skills: myGen?.skillText,
        hp: `${p.hp}/${p.maxHp}`,
        hand: handSummaryForPrompt(state, playerId),
        equips: Object.entries(p.equips)
          .filter(([, c]) => c)
          .map(([slot, c]) => `${slot}:${getCardDef(c!.defId).name}`),
      },
      others,
      prompt: legal,
      phase: state.phase,
      round: state.round,
    },
    null,
    0,
  )

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      setSeatThought(state, playerId, `LLM 錯誤 HTTP ${res.status} ${errText.slice(0, 80)}`)
      return null
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      setSeatThought(state, playerId, 'LLM 無回應，改用內建 AI')
      return null
    }
    const parsed = JSON.parse(stripCodeFence(content)) as LlmDecision
    if (parsed.thought) setSeatThought(state, playerId, parsed.thought)
    if (parsed.beliefs) applyBeliefUpdates(state, playerId, parsed.beliefs)
    return parsed
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    setSeatThought(state, playerId, `LLM 失敗（${msg.slice(0, 60)}），改用內建 AI`)
    return null
  }
}
