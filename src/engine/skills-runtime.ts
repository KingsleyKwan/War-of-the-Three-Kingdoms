/**
 * Active skill activation and multi-step skill card picks.
 */
import { getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'
import type { CardInstance, GameSnapshot, PlayerState } from './types'
import {
  attackRangeOf, canReach, cardKind, checkVictory, enemiesOf, equipSlots,
  findCard, getDistance, playerSkills, shuffle, withinDistanceOne,
} from './helpers'
import {
  armorKind, countDiscardable, mayUseSha, weaponKind,
} from './weapons'
import {
  log, draw, discardCard, takeHand, turnSkipOf, setPlayFx, pushDamageFx, skillLabel,
} from './core'
import {
  setPlayPrompt, legalTargets, askShan, pindian, dealDamage, trySave,
  getDying, isAwaitingZonePick, beginZonePick, continueLuanwu,
  finishTargetedCard, leaveEquipArea,
} from './game'

// NOTE: full body is in local fixed zip — if this placeholder remains, replace from artifacts/wtk-v0.16.0-source-fixed.zip
export function activateSkill(state: GameSnapshot, playerId: number, skillId: string): void {
  // full implementation in source zip
}
