import type { PackId, VictoryRule } from '../../engine/types'
import type { MapMovement } from './map'

export interface CampaignStage {
  id: string
  index: number
  title: string
  subtitle: string
  /** Historical era label, e.g. 中平元年 */
  era: string
  /** City id on the campaign map */
  battlefieldCityId: string
  /** City ownership at this moment in the story */
  cityFactions: Record<string, string>
  /** Troop / character movements shown on the map */
  movements: MapMovement[]
  /** Optional: only show these cities (defaults to factions + movements) */
  visibleCityIds?: string[]
  /** Story before the match */
  briefing: string
  /** Link from previous stage (shown above briefing) */
  prevLink?: string
  /** Base epilogue on win (dynamic lines appended) */
  epilogueWin: string
  /** Base epilogue on lose */
  epilogueLose: string
  /** After a win, tease the next stage */
  bridgeNext?: string
  /**
   * Theme packs for this battlefield (unioned with packs of featured generals).
   * Standard is always included.
   */
  packs: PackId[]
  /** Guarantee these card kinds / names appear in the deck */
  requiredCardKinds?: string[]
  /** Drop these kinds / names */
  excludeCardKinds?: string[]
  playerGeneralId: string
  allies: Array<{ generalId: string; name?: string }>
  /** Optional ally the player may pick (one) */
  allyChoices?: string[]
  enemies: Array<{ generalId: string; name?: string }>
  victory: VictoryRule
}

export interface CampaignDef {
  id: string
  title: string
  blurb: string
  stages: CampaignStage[]
}
