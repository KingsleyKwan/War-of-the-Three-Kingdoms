import { getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'
import { playerSkills } from './helpers'
import type { CardInstance, EquipSlot, GameSnapshot, PlayerState } from './types'
import { isRedCard } from './helpers'

export function weaponKind(p: PlayerState): string | null {
  const w = p.equips.weapon
  return w ? getCardDef(w.defId).kind : null
}

/** True if this seat may still use 【殺】 this turn (諸葛連弩／咆哮 allow extras). */
export function mayUseSha(p: PlayerState): boolean {
  if (p.tianyiLose) return false
  if (!p.shaUsedThisTurn) return true
  if (p.tianyiWin || playerSkills(p).includes('paoxiao')) return true
  return weaponKind(p) === 'zhuge'
}

export function armorKind(p: PlayerState): string | null {
  const a = p.equips.armor
  return a ? getCardDef(a.defId).kind : null
}

export function ignoresArmor(attacker: PlayerState): boolean {
  return weaponKind(attacker) === 'qinggang'
}

export function targetHorses(p: PlayerState): EquipSlot[] {
  const slots: EquipSlot[] = []
  if (p.equips.horseMinus) slots.push('horseMinus')
  if (p.equips.horsePlus) slots.push('horsePlus')
  return slots
}

export function countDiscardable(p: PlayerState): number {
  let n = p.hand.length
  for (const slot of ['weapon', 'armor', 'horseMinus', 'horsePlus'] as const) {
    if (p.equips[slot]) n++
  }
  n += p.judges?.length ?? 0
  return n
}

/** Draw a judgment card from deck (reshuffle discard if needed). */
export function drawJudgeCard(
  state: GameSnapshot,
  shuffleFn: (cards: CardInstance[]) => CardInstance[],
): CardInstance | null {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return null
    state.deck = shuffleFn(state.discard)
    state.discard = []
  }
  return state.deck.pop() ?? null
}

export function baguaJudgeSucceeds(card: CardInstance): boolean {
  return isRedCard(card)
}

export function oppositeGender(a: PlayerState, b: PlayerState): boolean {
  return getGeneral(a.generalId).gender !== getGeneral(b.generalId).gender
}

export function horseLabel(slot: EquipSlot, p: PlayerState): string {
  const c = p.equips[slot]
  if (!c) return slot
  return getCardDef(c.defId).name
}
