import { activateSkill, createMatch } from '../src/engine/game'
import { listSkillActions } from '../src/engine/skills'
import { buildStageMatch, CAOCAO_STAGES } from '../src/data/campaigns/caocao'

const stage = CAOCAO_STAGES.find((s) => s.allies.some((a) => a.generalId === 'dianwei'))
if (!stage) throw new Error('no dianwei stage')
const state = createMatch(buildStageMatch(stage))
state.phase = 'play'
state.matchPhase = 'playing'
const dianwei = state.players.find((p) => p.generalId === 'dianwei')!
const caocao = state.players.find((p) => p.generalId === 'caocao')!
state.currentPlayer = dianwei.id
state.prompt = {
  kind: 'choose_card',
  message: 'play',
  actorId: dianwei.id,
  cardUids: dianwei.hand.map((c) => c.uid),
}
dianwei.hp = 4
activateSkill(state, dianwei.id, 'qiangxi')
const targets = state.prompt.targetIds ?? []
console.log(
  JSON.stringify({
    stage: stage.id,
    sides: state.players.map((p) => ({ id: p.id, g: p.generalId, side: p.side })),
    qiangxiListed: listSkillActions(state, dianwei.id).some((a) => a.id === 'qiangxi'),
    promptKey: state.prompt.choiceKey,
    targets,
    includesCaocao: targets.includes(caocao.id),
  }),
)
if (targets.includes(caocao.id)) throw new Error('BUG: qiangxi can target caocao ally')
console.log('OK: qiangxi cannot target ally 曹操')
