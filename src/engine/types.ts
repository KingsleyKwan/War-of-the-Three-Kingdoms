export type Suit = 'spade' | 'heart' | 'club' | 'diamond'
export type CardType = 'basic' | 'trick' | 'equip'
export type EquipSlot = 'weapon' | 'armor' | 'horseMinus' | 'horsePlus'
export type PackId = 'standard' | 'ex'
export type Identity = 'lord' | 'loyal' | 'rebel' | 'spy' | 'none'
export type Kingdom = 'wei' | 'shu' | 'wu' | 'qun' | 'god'
export type Phase = 'prepare' | 'judge' | 'draw' | 'play' | 'discard' | 'end'
export type GameMode = 'duel' | 'identity5' | 'identity8'
export type MatchPhase = 'pick_general' | 'playing'

export interface CardDef {
  id: string
  name: string
  type: CardType
  pack: PackId
  suit?: Suit
  rank?: number
  /** For equipment */
  slot?: EquipSlot
  attackRange?: number
  /** Basic/trick kind key used by engine */
  kind: string
  /** Damage nature for 殺 variants (火殺 / 雷殺) */
  damageNature?: 'normal' | 'fire' | 'thunder'
}

export interface CardInstance {
  uid: string
  defId: string
}

export interface GeneralDef {
  id: string
  name: string
  kingdom: Kingdom
  maxHp: number
  gender: 'male' | 'female'
  skills: string[]
  skillText: string
  /** Expansion pack that owns this general */
  pack: PackId
}

export interface PlayerState {
  id: number
  name: string
  isHuman: boolean
  /** Empty until general is chosen / revealed */
  generalId: string
  identity: Identity
  hp: number
  maxHp: number
  hand: CardInstance[]
  equips: Partial<Record<EquipSlot, CardInstance>>
  /** 判定區（樂／兵糧／閃電等），對所有人可見 */
  judges: CardInstance[]
  alive: boolean
  shaUsedThisTurn: boolean
  /** 裸衣：本回合殺傷害+1且不能用錦囊 */
  luoyiActive?: boolean
  /** 制衡每回合限一次 */
  zhihengUsed?: boolean
  /** 仁德本回合已交出的牌數 */
  rendeCount?: number
  /** Temporary flags */
  skipNextShaLimit?: boolean
}

export type PromptKind =
  | 'idle'
  | 'choose_general'
  | 'choose_card'
  | 'choose_target'
  | 'respond_shan'
  | 'respond_sha'
  | 'discard'
  | 'choice'
  | 'skill_cards'
  | 'game_over'

export interface ChoiceOption {
  id: string
  label: string
}

export interface PromptState {
  kind: PromptKind
  message: string
  actorId: number | null
  /** Card UIDs that can be selected */
  cardUids?: string[]
  /** General ids offered for pick */
  generalIds?: string[]
  /** Player ids that can be targeted */
  targetIds?: number[]
  minTargets?: number
  maxTargets?: number
  /** Required response card kinds e.g. shan, sha, tao */
  respondKinds?: string[]
  /** How many to discard */
  discardCount?: number
  /** Optional multi-choice (weapon / skill triggers) */
  choices?: ChoiceOption[]
  /** Opaque context for resolveChoice */
  choiceKey?: string
  /** Accumulated targets (方天畫戟) */
  selectedTargetIds?: number[]
  /** Skill multi-card pick (丈八 / 制衡 / 仁德) */
  skillId?: string
  selectedCardUids?: string[]
  /** Zone pick: whose hand/equip is being chosen from */
  pickOwnerId?: number
  /** Zone pick: discard | steal */
  pickMode?: 'discard' | 'steal'
}

export interface LogEntry {
  text: string
  t: number
}

export interface KillRecord {
  victimId: number
  victimName: string
  killerId: number | null
  killerName: string | null
}

export interface VictoryRule {
  type: 'eliminate_enemies' | 'eliminate_all_others' | 'kill_target' | 'survive_rounds'
  targetGeneralId?: string
  rounds?: number
}

export interface MatchConfig {
  mode: GameMode
  packs: PackId[]
  /** Guarantee these card kinds appear in the shuffled deck */
  requiredCardKinds?: string[]
  humanSeat: number
  players: Array<{
    name: string
    isHuman: boolean
    generalId: string
    identity: Identity
  }>
  victory?: VictoryRule
  campaignStageId?: string
  /** Free play: defer dealing until generals are picked */
  deferGeneralPick?: boolean
  /** Offered generals for human (random 3 or full list) */
  offeredGenerals?: string[]
}

export interface PlayFx {
  cardName: string
  suit?: Suit
  rank?: number
  sourceId: number
  targetIds: number[]
  /** e.g. 響應 */
  note?: string
  seq: number
}

export interface DamageFx {
  playerId: number
  amount: number
  seq: number
}

export interface TableFx {
  play: PlayFx | null
  damages: DamageFx[]
}

export interface GameSnapshot {
  config: MatchConfig
  players: PlayerState[]
  deck: CardInstance[]
  discard: CardInstance[]
  currentPlayer: number
  phase: Phase
  matchPhase: MatchPhase
  round: number
  prompt: PromptState
  log: LogEntry[]
  /** Deaths in order; killer may be null (e.g. judgement / unknown) */
  killLog: KillRecord[]
  winnerIds: number[] | null
  resultMessage: string | null
  fx: TableFx
  /** Pending sha resolution */
  pending?: {
    type: 'sha'
    sourceId: number
    targetId: number
    cardUid: string
    /** 無雙：尚需閃的次數 */
    shanNeeded?: number
    /** 鐵騎：不可出閃 */
    skipShan?: boolean
    /** 造成傷害的牌（奸雄） */
    damageCard?: CardInstance
    /** 方天多目標佇列 */
    extraTargets?: number[]
  }
  /** 火屬性標記（火攻等） */
  _damageNature?: 'normal' | 'fire' | 'thunder'
  /** Per-seat AI identity beliefs / thoughts */
  aiMind?: Record<
    number,
    {
      beliefs: Record<
        number,
        {
          guess: string
          note: string
          excluded?: string[]
          evidence?: string[]
          confidence?: number
        }
      >
      thought: string
    }
  >
}
