/**
 * Hunting System - Turnbase Combat
 * Implements turnbase hunting/battle with monsters
 * Uses damage formula from formula.ts
 */

import { CombatStats, EnemyStats, Element, calculateDamage, DamageResult } from './formula'

// ============================================================================
// HUNTING TYPES
// ============================================================================

export type MonsterRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
export type BattleStatus = 'ongoing' | 'won' | 'lost' | 'fled'

/**
 * Monster definition
 */
export interface Monster {
  id: string
  name: string
  level: number
  element: Element
  rarity: MonsterRarity
  stats: EnemyStats
  expReward: number
  coinReward: number
  gemReward: number
  dropRate: number // Item drop chance %
}

/**
 * Hunt session tracking
 */
export interface HuntSession {
  sessionId: string
  jid: string // Character JID
  monster: Monster
  characterHp: number
  monsterHp: number
  turn: number // Current turn
  status: BattleStatus
  turnLog: TurnLog[]
  rewards: HuntRewards | null
}

/**
 * Single turn action
 */
export interface TurnLog {
  turn: number
  actor: 'character' | 'monster'
  action: 'attack' | 'defend' | 'special'
  damage: DamageResult | null
  hpBefore: number
  hpAfter: number
  isCrit: boolean
}

/**
 * Hunt rewards
 */
export interface HuntRewards {
  exp: number
  coins: number
  gems: number
  itemDropped: boolean
  duration: number // Turn count
}

// ============================================================================
// MONSTER DATABASE
// ============================================================================

export const MONSTER_POOL: Record<number, Monster[]> = {
  1: [
    {
      id: 'slime_green',
      name: 'Green Slime',
      level: 1,
      element: 'Aqua',
      rarity: 'Common',
      stats: {
        level: 1,
        defenseDebuff: 0,
        pyroResistance: -50,
        aquaResistance: 50,
        geoResistance: 0,
        aeroResistance: 0,
        voltResistance: 0,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 50,
      coinReward: 30,
      gemReward: 1,
      dropRate: 10,
    },
    {
      id: 'slime_blue',
      name: 'Blue Slime',
      level: 2,
      element: 'Aqua',
      rarity: 'Common',
      stats: {
        level: 2,
        defenseDebuff: 0,
        pyroResistance: -40,
        aquaResistance: 55,
        geoResistance: 0,
        aeroResistance: 0,
        voltResistance: 0,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 65,
      coinReward: 40,
      gemReward: 1,
      dropRate: 12,
    },
    {
      id: 'goblin_scout',
      name: 'Goblin Scout',
      level: 3,
      element: 'Aero',
      rarity: 'Common',
      stats: {
        level: 3,
        defenseDebuff: 0,
        pyroResistance: 0,
        aquaResistance: 0,
        geoResistance: -20,
        aeroResistance: 30,
        voltResistance: 0,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 75,
      coinReward: 50,
      gemReward: 2,
      dropRate: 15,
    },
    {
      id: 'bat_common',
      name: 'Bat',
      level: 2,
      element: 'Aero',
      rarity: 'Common',
      stats: {
        level: 2,
        defenseDebuff: 0,
        pyroResistance: 0,
        aquaResistance: 0,
        geoResistance: -30,
        aeroResistance: 25,
        voltResistance: 0,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 60,
      coinReward: 35,
      gemReward: 1,
      dropRate: 8,
    },
  ],
  5: [
    {
      id: 'goblin_warrior',
      name: 'Goblin Warrior',
      level: 5,
      element: 'Aero',
      rarity: 'Uncommon',
      stats: {
        level: 5,
        defenseDebuff: 0,
        pyroResistance: 5,
        aquaResistance: 0,
        geoResistance: -15,
        aeroResistance: 35,
        voltResistance: 0,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 120,
      coinReward: 80,
      gemReward: 2,
      dropRate: 18,
    },
    {
      id: 'spider_forest',
      name: 'Forest Spider',
      level: 6,
      element: 'Geo',
      rarity: 'Uncommon',
      stats: {
        level: 6,
        defenseDebuff: 0,
        pyroResistance: 10,
        aquaResistance: 10,
        geoResistance: 40,
        aeroResistance: 0,
        voltResistance: -20,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 135,
      coinReward: 90,
      gemReward: 3,
      dropRate: 20,
    },
    {
      id: 'stone_golem',
      name: 'Stone Golem',
      level: 7,
      element: 'Geo',
      rarity: 'Uncommon',
      stats: {
        level: 7,
        defenseDebuff: 0,
        pyroResistance: 15,
        aquaResistance: -25,
        geoResistance: 50,
        aeroResistance: 0,
        voltResistance: 10,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 150,
      coinReward: 100,
      gemReward: 3,
      dropRate: 22,
    },
  ],
  10: [
    {
      id: 'wolf_forest',
      name: 'Forest Wolf',
      level: 10,
      element: 'Aero',
      rarity: 'Uncommon',
      stats: {
        level: 10,
        defenseDebuff: 0,
        pyroResistance: 10,
        aquaResistance: 0,
        geoResistance: 5,
        aeroResistance: 20,
        voltResistance: 0,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 200,
      coinReward: 150,
      gemReward: 4,
      dropRate: 25,
    },
    {
      id: 'imp_fire',
      name: 'Fire Imp',
      level: 11,
      element: 'Pyro',
      rarity: 'Uncommon',
      stats: {
        level: 11,
        defenseDebuff: 0,
        pyroResistance: 45,
        aquaResistance: -35,
        geoResistance: 10,
        aeroResistance: 0,
        voltResistance: 5,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 220,
      coinReward: 160,
      gemReward: 4,
      dropRate: 26,
    },
    {
      id: 'orc_scout',
      name: 'Orc Scout',
      level: 12,
      element: 'Aero',
      rarity: 'Rare',
      stats: {
        level: 12,
        defenseDebuff: 0,
        pyroResistance: 15,
        aquaResistance: 5,
        geoResistance: 20,
        aeroResistance: 15,
        voltResistance: 0,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 250,
      coinReward: 180,
      gemReward: 5,
      dropRate: 28,
    },
  ],
  15: [
    {
      id: 'minotaur',
      name: 'Minotaur',
      level: 15,
      element: 'Geo',
      rarity: 'Rare',
      stats: {
        level: 15,
        defenseDebuff: 0,
        pyroResistance: 20,
        aquaResistance: -20,
        geoResistance: 45,
        aeroResistance: 5,
        voltResistance: 10,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 350,
      coinReward: 250,
      gemReward: 6,
      dropRate: 30,
    },
    {
      id: 'harpy',
      name: 'Harpy',
      level: 14,
      element: 'Aero',
      rarity: 'Rare',
      stats: {
        level: 14,
        defenseDebuff: 0,
        pyroResistance: 10,
        aquaResistance: 5,
        geoResistance: -20,
        aeroResistance: 40,
        voltResistance: 5,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 330,
      coinReward: 230,
      gemReward: 5,
      dropRate: 29,
    },
  ],
  20: [
    {
      id: 'dragon_young',
      name: 'Young Drake',
      level: 20,
      element: 'Pyro',
      rarity: 'Rare',
      stats: {
        level: 20,
        defenseDebuff: 0,
        pyroResistance: 50,
        aquaResistance: -30,
        geoResistance: 20,
        aeroResistance: 10,
        voltResistance: 0,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 500,
      coinReward: 400,
      gemReward: 8,
      dropRate: 35,
    },
    {
      id: 'dark_knight',
      name: 'Dark Knight',
      level: 21,
      element: 'Volt',
      rarity: 'Epic',
      stats: {
        level: 21,
        defenseDebuff: 0,
        pyroResistance: 25,
        aquaResistance: 20,
        geoResistance: 30,
        aeroResistance: 15,
        voltResistance: 50,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 550,
      coinReward: 450,
      gemReward: 10,
      dropRate: 40,
    },
    {
      id: 'frost_elemental',
      name: 'Frost Elemental',
      level: 19,
      element: 'Aqua',
      rarity: 'Rare',
      stats: {
        level: 19,
        defenseDebuff: 0,
        pyroResistance: -40,
        aquaResistance: 55,
        geoResistance: 10,
        aeroResistance: 5,
        voltResistance: 20,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 480,
      coinReward: 380,
      gemReward: 7,
      dropRate: 33,
    },
  ],
  30: [
    {
      id: 'demon_lord',
      name: 'Demon Lord',
      level: 30,
      element: 'Pyro',
      rarity: 'Epic',
      stats: {
        level: 30,
        defenseDebuff: 0,
        pyroResistance: 60,
        aquaResistance: -40,
        geoResistance: 25,
        aeroResistance: 20,
        voltResistance: 10,
        resistanceBuffs: 5,
        resistanceDebuffs: 0,
      },
      expReward: 800,
      coinReward: 700,
      gemReward: 15,
      dropRate: 45,
    },
    {
      id: 'lich',
      name: 'Lich',
      level: 31,
      element: 'Volt',
      rarity: 'Epic',
      stats: {
        level: 31,
        defenseDebuff: 0,
        pyroResistance: 30,
        aquaResistance: 30,
        geoResistance: 35,
        aeroResistance: 25,
        voltResistance: 55,
        resistanceBuffs: 0,
        resistanceDebuffs: 0,
      },
      expReward: 850,
      coinReward: 750,
      gemReward: 16,
      dropRate: 47,
    },
    {
      id: 'phoenix',
      name: 'Phoenix',
      level: 29,
      element: 'Pyro',
      rarity: 'Legendary',
      stats: {
        level: 29,
        defenseDebuff: 0,
        pyroResistance: 70,
        aquaResistance: -50,
        geoResistance: 30,
        aeroResistance: 35,
        voltResistance: 5,
        resistanceBuffs: 5,
        resistanceDebuffs: 0,
      },
      expReward: 1200,
      coinReward: 1000,
      gemReward: 25,
      dropRate: 60,
    },
  ],
}

// ============================================================================
// HUNTING FUNCTIONS
// ============================================================================

/**
 * Get available monsters for a character level
 */
export function getAvailableMonsters(characterLevel: number): Monster[] {
  const monsters: Monster[] = []
  for (const [levelRange, monsterList] of Object.entries(MONSTER_POOL)) {
    const minLevel = parseInt(levelRange)
    if (characterLevel >= minLevel) {
      monsters.push(...monsterList)
    }
  }
  return monsters
}

/**
 * Create a new hunt session
 */
export function createHuntSession(
  jid: string,
  characterStats: CombatStats,
  monster: Monster
): HuntSession {
  return {
    sessionId: `hunt_${jid}_${Date.now()}`,
    jid,
    monster,
    characterHp: characterStats.hp,
    monsterHp: 200 + monster.level * 10, // Monster HP calculation
    turn: 0,
    status: 'ongoing',
    turnLog: [],
    rewards: null,
  }
}

/**
 * Execute character attack
 */
export async function executeCharacterAttack(
  session: HuntSession,
  characterStats: CombatStats,
  talentMultiplier: number = 100,
  elementAdvantage: number = 1
): Promise<TurnLog> {
  // Roll for crit (20% crit chance)
  const critRoll = Math.random() < 0.2 ? 1 : 0
  const isCrit = critRoll === 1

  const damageResult = await calculateDamage(
    characterStats,
    session.monster.stats,
    talentMultiplier,
    critRoll,
    elementAdvantage
  )

  const hpBefore = session.monsterHp
  session.monsterHp = Math.max(0, session.monsterHp - damageResult.finalDamage)
  const hpAfter = session.monsterHp

  const log: TurnLog = {
    turn: session.turn,
    actor: 'character',
    action: 'attack',
    damage: damageResult,
    hpBefore,
    hpAfter,
    isCrit,
  }

  session.turnLog.push(log)

  // Check if monster is defeated
  if (session.monsterHp <= 0) {
    session.status = 'won'
    session.rewards = {
      exp: session.monster.expReward,
      coins: session.monster.coinReward,
      gems: session.monster.gemReward,
      itemDropped: Math.random() * 100 < session.monster.dropRate,
      duration: session.turn,
    }
  }

  return log
}

/**
 * Execute monster attack
 */
export async function executeMonsterAttack(
  session: HuntSession,
  characterStats: CombatStats
): Promise<TurnLog> {
  // Monster has simpler stats for now
  const monsterAsAttacker: CombatStats = {
    level: session.monster.level,
    baseAtk: 10 + session.monster.level,
    atkPercent: 5,
    flatAtkBonus: 5,
    critDamage: 30,
    element: session.monster.element,
    elementalDamageBonus: 10,
    physicalDamageBonus: 10,
    defense: 5,
    hp: session.monsterHp,
  }

  const characterAsTarget: EnemyStats = {
    level: characterStats.level,
    defenseDebuff: 0,
    pyroResistance: 10,
    aquaResistance: 10,
    geoResistance: 10,
    aeroResistance: 10,
    voltResistance: 10,
    resistanceBuffs: 0,
    resistanceDebuffs: 0,
  }

  const critRoll = Math.random() < 0.15 ? 1 : 0 // Monster has 15% crit
  const isCrit = critRoll === 1

  const damageResult = await calculateDamage(
    monsterAsAttacker,
    characterAsTarget,
    80, // Monster uses 80% talent multiplier
    critRoll
  )

  const hpBefore = session.characterHp
  session.characterHp = Math.max(0, session.characterHp - damageResult.finalDamage)
  const hpAfter = session.characterHp

  const log: TurnLog = {
    turn: session.turn,
    actor: 'monster',
    action: 'attack',
    damage: damageResult,
    hpBefore,
    hpAfter,
    isCrit,
  }

  session.turnLog.push(log)

  // Check if character is defeated
  if (session.characterHp <= 0) {
    session.status = 'lost'
    session.rewards = {
      exp: 0,
      coins: 0,
      gems: 0,
      itemDropped: false,
      duration: session.turn,
    }
  }

  return log
}

/**
 * Execute one full turn (character attacks, then monster counterattacks if alive)
 */
export async function executeTurn(
  session: HuntSession,
  characterStats: CombatStats,
  elementAdvantage: number = 1
): Promise<TurnLog[]> {
  const logs: TurnLog[] = []

  // Increment turn counter
  session.turn++

  // Character attacks
  const charAttackLog = await executeCharacterAttack(session, characterStats, 100, elementAdvantage)
  logs.push(charAttackLog)

  // If monster still alive, monster attacks
  if (session.status === 'ongoing' && session.monsterHp > 0) {
    const monsterAttackLog = await executeMonsterAttack(session, characterStats)
    logs.push(monsterAttackLog)
  }

  return logs
}

/**
 * Flee from hunt
 */
export function fleeHunt(session: HuntSession): boolean {
  // 40% chance to flee successfully
  if (Math.random() < 0.4) {
    session.status = 'fled'
    session.rewards = {
      exp: 0,
      coins: 0,
      gems: 0,
      itemDropped: false,
      duration: session.turn,
    }
    return true
  }
  return false
}

/**
 * Get hunt summary
 */
export function getHuntSummary(session: HuntSession): string {
  const lines = [
    `🎯 Hunt Summary`,
    `Monster: ${session.monster.name} (Lvl ${session.monster.level})`,
    `Status: ${session.status.toUpperCase()}`,
    `Turns: ${session.turn}`,
    `Character HP: ${Math.max(0, session.characterHp)}`,
    `Monster HP: ${Math.max(0, session.monsterHp)}`,
  ]

  if (session.rewards) {
    lines.push(`\n💰 Rewards:`)
    lines.push(`EXP: +${session.rewards.exp}`)
    lines.push(`Coins: +${session.rewards.coins}`)
    lines.push(`Gems: +${session.rewards.gems}`)
    if (session.rewards.itemDropped) {
      lines.push(`🎁 Item dropped!`)
    }
  }

  return lines.join('\n')
}
