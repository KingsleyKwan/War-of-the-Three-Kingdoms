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
  alive: boolean
  shaUsedThisTurn: boolean
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
  | 'game_over'

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
}

export interface LogEntry {
  text: string
  t: number
}

export interface VictoryRule {
  type: 'eliminate_enemies' | 'eliminate_all_others' | 'kill_target' | 'survive_rounds'
  targetGeneralId?: string
  rounds?: number
}

export interface MatchConfig {
  mode: GameMode
  packs: PackId[]
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
  winnerIds: number[] | null
  resultMessage: string | null
  fx: TableFx
  /** Pending sha resolution */
  pending?: {
    type: 'sha'
    sourceId: number
    targetId: number
    cardUid: string
  }
}
