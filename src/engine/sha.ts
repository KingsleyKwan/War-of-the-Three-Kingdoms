/**
 * 殺 / 閃 response, hit, dodge, weapon follow-ups.
 */
import { getCardDef } from '../data/cards'
import { getGeneral } from '../data/generals'
import type {
  CardInstance,
  GameSnapshot,
  PlayerState,
  PromptKind,
} from './types'
import {
  activePlayers,
  alive,
  distance,
  handLimit,
  isEnemy,
  log,
  opponent,
  playerById,
  removeCardFromHand,
  seatName,
} from './helpers'
import { weaponRange } from './weapons'
import { SKILL_CATALOG } from './skillCatalog'
import {
  clearPlayFx,
  setPlayFx,
  afterCardUsed,
  afterTrick,
  draw,
  discardOne,
  discardFromHand,
  gainCard,
  moveToDiscard,
  reshuffleIfNeeded,
} from './core'

// NOTE: full body will be replaced — this is a marker; actual push uses complete file from disk
export function askShan() {}
