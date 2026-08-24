# Engine module map

> **For Grok / mobile sessions:** edit the smallest relevant file.
> Keep each module **under ~100KB** for reliable tool-based deploy.

## Layout (as of 2026-08-24)

| File | Role | ~Size |
|------|------|-------|
| `types.ts` | Shared types | 8KB |
| `helpers.ts` | Pure helpers (distance, suits) | 10KB |
| `weapons.ts` | Weapon/armor helpers | 2KB |
| `skillCatalog.ts` | Skill metadata | 15KB |
| `skills.ts` | Active skill buttons for UI | 7KB |
| **`core.ts`** | UID, FX, log, draw/discard, `takeHand`, turn-skip | 4KB |
| **`sha.ts`** | 殺/閃 response, hit, dodge, 青龍/貫石 | 24KB |
| **`damage.ts`** | `dealDamage`, dying, 桃, death | 21KB |
| **`skills-runtime.ts`** | `activateSkill`, rende/zhangba multi-step | 19KB |
| **`choice.ts`** | `resolveChoice` dispatcher | 54KB |
| **`game.ts`** | Match/turn/play/tricks/effects + public barrel | 91KB |

## Public API (stable — always import from `./game`)

`createMatch`, `confirmGeneralPick`, `selectCard`, `selectTarget`, `resolveChoice`,
`passResponse`, `activateSkill`, `endPlayPhase`, `cancelTarget`, `playableCards`,
`getPlayKindOptions`, `getLegalTargets`, `getAttackRange`, `clearPlayFx`, `debugDealDamage`

Circular imports between `game.ts` ↔ domain modules are intentional (function-level only).

## Further extraction (optional)

From `game.ts` still possible:
1. `match.ts` — createMatch, general pick, board setup
2. `turn.ts` — beginTurn, prepare, setPlayPrompt, end phase
3. `tricks.ts` — afterTrick, 無懈, AOE, 決鬥, 五穀
4. `effects.ts` — continueLuanwu, resumeAfterResponse, zone picks

## Bug-fix anchors

- 集智 + 無懈: `afterTrick(state, p)` in wuxie `use` branch inside `choice.ts` / resolveChoice
- 神速 infinite 閃: `resumeAfterResponse` advances `phase` from `'draw'` → `'play'`
