import { getGeneral } from '../data/generals'
import type { GameSnapshot, PlayerState } from './types'
import { canReach } from './helpers'
import { weaponKind } from './weapons'

export interface SkillAction {
  id: string
  label: string
  hint: string
}

/** Active skill buttons shown in the play phase */
export function listSkillActions(state: GameSnapshot, playerId: number): SkillAction[] {
  const p = state.players[playerId]
  if (!p?.alive || state.phase !== 'play' || state.currentPlayer !== playerId) return []
  if (state.prompt.kind !== 'choose_card') return []
  const skills = getGeneral(p.generalId).skills
  const actions: SkillAction[] = []

  if (skills.includes('kurou') && p.hp > 0) {
    actions.push({ id: 'kurou', label: '苦肉', hint: '失去1點體力，摸兩張牌' })
  }
  if (skills.includes('zhiheng') && !p.zhihengUsed && p.hand.length > 0) {
    actions.push({ id: 'zhiheng', label: '制衡', hint: '棄任意張牌，摸等量的牌' })
  }
  if (skills.includes('rende') && p.hand.length > 0) {
    const others = state.players.filter((o) => o.alive && o.id !== playerId)
    if (others.length) {
      actions.push({ id: 'rende', label: '仁德', hint: '將手牌交給其他角色，兩張可回1體力' })
    }
  }
  if (skills.includes('luoyi') && !p.luoyiActive && p.hand.length >= 2) {
    actions.push({ id: 'luoyi', label: '裸衣', hint: '棄兩張牌：本回合殺傷害+1，不能用錦囊' })
  }
  if (weaponKind(p) === 'zhangba' && p.hand.length >= 2) {
    const canHit = state.players.some(
      (t) => t.alive && t.id !== playerId && canReach(state, playerId, t.id),
    )
    if (canHit) {
      actions.push({ id: 'zhangba', label: '丈八出殺', hint: '將兩張手牌當【殺】使用' })
    }
  }
  return actions
}

export function hasSkill(p: PlayerState, id: string): boolean {
  if (!p.generalId) return false
  return getGeneral(p.generalId).skills.includes(id)
}
