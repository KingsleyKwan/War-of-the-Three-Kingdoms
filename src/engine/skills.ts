import { getGeneral } from '../data/generals'
import { getCardDef } from '../data/cards'
import type { GameSnapshot, PlayerState } from './types'
import { attackRangeOf, canReach, enemiesOf, getDistance, playerSkills } from './helpers'
import { mayUseSha, weaponKind } from './weapons'

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
  const skills = playerSkills(p)
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
    actions.push({ id: 'luoyi', label: '裸衣', hint: '棄兩張牌：本回合殺／決鬥傷害+1，不能用錦囊' })
  }
  if (skills.includes('qiangxi') && !p.qiangxiUsed) {
    const range = attackRangeOf(p)
    const foes = enemiesOf(state, playerId).filter(
      (tid) => getDistance(state, playerId, tid) <= range,
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
  if (skills.includes('guhuo') && !p.guhuoUsed && p.hand.length > 0) {
    actions.push({ id: 'guhuo', label: '蠱惑', hint: '將一張手牌當殺、閃、桃或無中生有' })
  }
  if (skills.includes('tianyi') && !p.tianyiUsed && p.hand.length > 0) {
    const targets = enemiesOf(state, playerId).some((tid) => state.players[tid]?.hand.length > 0)
    if (targets) actions.push({ id: 'tianyi', label: '天義', hint: '與一名角色拼點' })
  }
  if (skills.includes('quhu') && !p.quhuUsed && p.hand.length > 0) {
    const targets = enemiesOf(state, playerId).some(
      (tid) => (state.players[tid]?.hp ?? 0) > p.hp && (state.players[tid]?.hand.length ?? 0) > 0,
    )
    if (targets) actions.push({ id: 'quhu', label: '驅虎', hint: '與體力較高角色拼點' })
  }
  if (skills.includes('tiaoxin') && !p.tiaoxinUsed) {
    const foes = enemiesOf(state, playerId).filter((tid) => canReach(state, playerId, tid))
    if (foes.length) {
      actions.push({ id: 'tiaoxin', label: '挑釁', hint: '令攻擊範圍內角色出殺或棄牌' })
    }
  }
  if (skills.includes('dimeng') && !p.dimengUsed && p.hand.length > 0) {
    actions.push({ id: 'dimeng', label: '締盟', hint: '棄手牌並交換兩名角色手牌' })
  }
  if (skills.includes('luanwu') && !p.luanwuUsed) {
    actions.push({ id: 'luanwu', label: '亂武', hint: '其他角色對距離最近者出殺，否則失去1體力' })
  }
  if (skills.includes('qiaobian') && !p.qiaobianUsed && p.hand.length > 0) {
    actions.push({ id: 'qiaobian', label: '巧變', hint: '棄一張牌並摸一張牌' })
  }
  if (skills.includes('fangquan') && !p.fangquanUsed) {
    actions.push({ id: 'fangquan', label: '放權', hint: '結束出牌並令一名其他角色摸兩張' })
  }
  if (skills.includes('jixi') && (p.tianCount ?? 0) > 0) {
    actions.push({ id: 'jixi', label: '急襲', hint: '消耗一張田，視為使用順手牽羊' })
  }
  if (skills.includes('zhijian')) {
    const hasEquip = p.hand.some((c) => getCardDef(c.defId).type === 'equip')
    if (hasEquip) actions.push({ id: 'zhijian', label: '直諫', hint: '將裝備交給其他角色並摸一張' })
  }
  if (skills.includes('zhiba')) {
    const unused = state.players.some(
      (t) => t.alive && t.id !== playerId && !(p.zhibaUsedOn ?? []).includes(t.id) && t.hand.length,
    )
    if (unused && p.hand.length) actions.push({ id: 'zhiba', label: '制霸', hint: '與一名角色拼點' })
  }
  if (skills.includes('ganlu') && !p.ganluUsed) {
    const wounded = p.maxHp - p.hp
    const alive = state.players.filter((t) => t.alive)
    const canSwap = alive.some((a, i) =>
      alive.slice(i + 1).some((b) => {
        const ac = Object.values(a.equips).filter(Boolean).length
        const bc = Object.values(b.equips).filter(Boolean).length
        return Math.abs(ac - bc) <= wounded
      }),
    )
    if (canSwap) actions.push({ id: 'ganlu', label: '甘露', hint: '交換兩名角色的裝備區' })
  }
  if (skills.includes('xiansi') && (p.niCards?.length ?? 0) >= 2 && mayUseSha(p)) {
    const canHit = enemiesOf(state, playerId).some((tid) => canReach(state, playerId, tid))
    if (canHit) actions.push({ id: 'xiansi', label: '陷嗣出殺', hint: '棄兩張「逆」，視為使用【殺】' })
  }
  if (weaponKind(p) === 'zhangba' && p.hand.length >= 2 && mayUseSha(p)) {
    const canHit = enemiesOf(state, playerId).some((tid) => canReach(state, playerId, tid))
    if (canHit) {
      actions.push({
        id: 'zhangba',
        label: '丈八出殺',
        hint: '將兩張手牌當【殺】使用（本階段限一次，諸葛連弩／咆哮除外）',
      })
    }
  }
  return actions
}

export function hasSkill(p: PlayerState, id: string): boolean {
  return playerSkills(p).includes(id)
}
