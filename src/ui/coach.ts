import { getCardDef } from '../data/cards'
import { isTutorialStageId } from '../data/campaigns/tutorial'
import type { GameSnapshot } from '../engine/types'

export interface CoachSlide {
  title: string
  body: string
}

const INTRO: Record<string, CoachSlide[]> = {
  tutorial_01: [
    {
      title: '座位與體力',
      body: '周圍是各座位。紅心是體力。你永遠在畫面靠近自己的一側。點座位上的 ℹ 可看武將技能。',
    },
    {
      title: '手牌區',
      body: '底部一排是你的手牌。亮起、可點的牌才是現在能用的。點 ℹ 看牌面說明。',
    },
    {
      title: '出【殺】',
      body: '出牌階段點一張【殺】（再點一次打出），然後點亮起的敵方座位作為目標。對方可出【閃】抵消。',
    },
    {
      title: '結束與棄牌',
      body: '不想再出牌就按「結束出牌」。手牌多過體力上限時，要棄到上限。完成後輪到對手。',
    },
  ],
  tutorial_02: [
    {
      title: '裝備區',
      body: '座位上「裝備」那一行就是裝備區。本關你已戴上【諸葛連弩】：攻擊範圍 1，但一回合可出多張【殺】。',
    },
    {
      title: '錦囊',
      body: '【無中生有】摸兩張；【過河拆橋】選一名角色，棄其手牌或裝備（手牌背面看不見內容）。錦囊多數無距離限制。',
    },
    {
      title: '再出殺',
      body: '有連弩時，出完一張【殺】後仍可再出【殺】。打完按「結束出牌」。',
    },
  ],
  tutorial_03: [
    {
      title: '瀕死',
      body: '體力到 0 會問全場是否出【桃】。救到體力大於 0 才活。問到你時，亮起的【桃】點兩下打出。',
    },
    {
      title: '這一關',
      body: '雙方體力都很低。你可用【殺】先手；自己受傷時記得留【桃】。華佗的紅牌也可當桃（技能詳見 ℹ）。',
    },
  ],
}

export function tutorialIntroSlides(stageId: string | null | undefined): CoachSlide[] {
  if (!stageId) return []
  return INTRO[stageId] ?? []
}

export function isTutorialMatch(g: GameSnapshot | null): boolean {
  return !!g && isTutorialStageId(g.config.campaignStageId)
}

/** Loud current-step instruction for the action hint bar. */
export function nextActionHint(g: GameSnapshot, selectedUid: string | null): string {
  const prompt = g.prompt
  const human = g.players.find((p) => p.isHuman)
  if (!human || g.winnerIds) return ''
  if (g.matchPhase === 'pick_general') return '請點選一名武將，確認後開局'
  if (prompt.actorId !== human.id) return '等待其他角色行動…'

  switch (prompt.kind) {
    case 'choose_card': {
      if (selectedUid) {
        const card = human.hand.find((c) => c.uid === selectedUid)
        const name = card ? getCardDef(card.defId).name : '此牌'
        return `已選【${name}】— 再點同一張打出，或點其他牌改選`
      }
      if (g.phase === 'play') return '出牌階段：點亮起的手牌使用，或按「結束出牌」'
      return prompt.message || '請選擇一張牌'
    }
    case 'choose_target':
      return '請點亮起、會閃爍的座位作為目標'
    case 'respond_shan':
      return '需要【閃】：點亮起的【閃】打出，或按「放棄」承受傷害'
    case 'respond_sha':
      return '需要【殺】：點亮起的【殺】打出，或按「放棄」'
    case 'discard':
      return `棄牌階段：點選要棄的牌（需棄 ${prompt.discardCount ?? ''} 張）`
    case 'choice':
      return prompt.message || '請在上方選項中點選'
    case 'skill_cards':
      return prompt.message || '請依技能選擇牌，再按確認'
    default:
      return prompt.message || ''
  }
}
