import { getGeneral } from '../data/generals'
import { getCardDef } from '../data/cards'
import type { GameSnapshot, PlayerState } from './types'
import { attackRangeOf, canReach, getDistance } from './helpers'
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
  if (skills.includes('qiangxi') && !p.qiangxiUsed) {
    const range = attackRangeOf(p)
    const foes = state.players.filter(
      (t) => t.alive && t.id !== playerId && getDistance(state, playerId, t.id) <= range,
    )
    const hasWeapon =
      !!p.equips.weapon ||
      p.hand.some((c) => getCardDef(c.defId).slot === 'weapon')
    if (foes.length && (p.hp > 0 || hasWeapon)) {
      actions.push({
        id: 'qiangxi',
        label: '強襲',
        hint: '失去1體力或棄武器，對攻擊範圍內造成1傷害',
      })
    }
  }
  if (skills.includes('qingnang') && !p.qingnangUsed && p.hand.length > 0) {
    const wounded = state.players.filter((t) => t.alive && t.hp < t.maxHp)
    if (wounded.length) {
      actions.push({ id: 'qingnang', label: '青囊', hint: '棄一張牌，令一名角色回1體力' })
    }
  }
  if (skills.includes('jieyin') && !p.jieyinUsed && p.hand.length >= 2) {
    const males = state.players.filter(
      (t) => t.alive && t.generalId && getGeneral(t.generalId).gender === 'male',
    )
    if (males.length) {
      actions.push({ id: 'jieyin', label: '結姻', hint: '棄兩張牌，令自己與一名男性各回1體力' })
    }
  }
  if (skills.includes('lijian') && !p.lijianUsed && p.hand.length > 0) {
    const males = state.players.filter(
      (t) =>
        t.alive &&
        t.id !== playerId &&
        t.generalId &&
        getGeneral(t.generalId).gender === 'male',
    )
    if (males.length >= 2) {
      actions.push({ id: 'lijian', label: '離間', hint: '棄一張牌，令兩名男性決鬥' })
    }
  }
  if (skills.includes('fanjian') && !p.fanjianUsed && p.hand.length > 0) {
    const others = state.players.filter((t) => t.alive && t.id !== playerId)
    if (others.length) {
      actions.push({ id: 'fanjian', label: '反間', hint: '交給一名角色一張牌並令其猜花色' })
    }
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
