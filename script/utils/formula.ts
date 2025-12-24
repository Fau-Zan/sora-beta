/**
 * RPG Combat Formula System
 * Implements damage calculation formula with element system
 * Elements: Pyro, Aqua, Geo, Aero, Volt
 * Applicable to: PvE, PvP, and all combat scenarios
 */

// ============================================================================
// TYPES & ENUMS
// ============================================================================

export type Element = 'Pyro' | 'Aqua' | 'Geo' | 'Aero' | 'Volt'
export type ClassType = 'Swordsman' | 'Archer' | 'Spear' | 'Mage' | 'Ranger'
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'

/**
 * Equipment stats
 */
export interface Equipment {
  id: string
  name: string
  type: 'weapon' | 'armor' | 'accessory'
  rarity: Rarity
  atkBonus: number // ATK bonus
  defenseBonus: number // DEF bonus
  hpBonus: number // HP bonus
  critDamageBonus: number // Crit damage %
  atkPercentBonus: number // ATK% bonus
  elementBonus?: Element // Element bonus
  elementalDamageBonusBonus: number
}

/**
 * Character combat stats for damage calculation
 */
export interface CombatStats {
  level: number
  baseAtk: number // Base attack (character + weapon)
  atkPercent: number // Total ATK %
  flatAtkBonus: number // Flat ATK bonus (A)
  critDamage: number // Crit damage %
  element: Element
  elementalDamageBonus: number // E
  physicalDamageBonus: number // P
  defense: number // Defense stat
  hp: number // HP
  equipments?: Equipment[] // Equipped items
}

/**
 * Enemy/Target defense stats
 */
export interface EnemyStats {
  level: number
  defenseDebuff: number // D (target defense debuff %)
  // Resistance stats
  pyroResistance: number
  aquaResistance: number
  geoResistance: number
  aeroResistance: number
  voltResistance: number
  // Resistance buffs/debuffs
  resistanceBuffs: number // rp+ or re+
  resistanceDebuffs: number //- or re- rp
}

/**
 * Damage calculation result
 */
export interface DamageResult {
  baseDamage: number
  finalDamage: number
  critDamage: number
  resistanceReduction: number
  defenseReduction: number
  multiplier: number
  breakdown: string[]
}

// ============================================================================
// ELEMENT SYSTEM
// ============================================================================

/**
 * Element advantage matrix
 * Positive value = advantage, negative = disadvantage, 0 = neutral
 */
export const ELEMENT_ADVANTAGE: Record<Element, Record<Element, number>> = {
  // Advantage matrix based on element descriptions
  // Positive = advantage, Negative = disadvantage, 0 = neutral
  Pyro: { Pyro: 0, Aqua: -1, Geo: 0, Aero: 1, Volt: 0 },
  Aqua: { Pyro: 1, Aqua: 0, Geo: 0, Aero: -1, Volt: 1 },
  Geo: { Pyro: 0, Aqua: 0, Geo: 0, Aero: -1, Volt: 1 },
  Aero: { Pyro: -1, Aqua: 1, Geo: 1, Aero: 0, Volt: 0 },
  Volt: { Pyro: 0, Aqua: 1, Geo: -1, Aero: 0, Volt: 0 },
}

/**
 * Calculate element advantage multiplier
 * Strong against: 1.5x damage
 * Weak against: 0.75x damage
 * Neutral: 1.0x damage
 * No element selected: 1.0x damage (no bonus, no penalty)
 */
export function getElementAdvantageMultiplier(attackerElement: Element | null, targetElement: Element): number {
  // No element selected = no advantage
  if (!attackerElement) return 1.0

  const advantage = ELEMENT_ADVANTAGE[attackerElement][targetElement]

  if (advantage > 0) return 1.5 // Strong against
  if (advantage < 0) return 0.75 // Weak against
  return 1.0 // Neutral
}

/**
 * Get element description
 */
export function getElementDescription(element: Element | null): string {
  if (!element) return 'None (Normal)'
  const descriptions: Record<Element, string> = {
    Pyro: 'Fire - Strong vs Aero, Weak vs Aqua',
    Aqua: 'Water - Strong vs Pyro, Weak vs Aero',
    Geo: 'Earth - Strong vs Volt, Weak vs Aero',
    Aero: 'Wind - Strong vs Aqua & Geo, Weak vs Pyro',
    Volt: 'Lightning - Strong vs Aqua, Weak vs Geo',
  }
  return descriptions[element]
}

/**
 * Get resistance value based on element
 */
function getResistanceByElement(enemy: EnemyStats, element: Element): number {
  switch (element) {
    case 'Pyro':
      return enemy.pyroResistance
    case 'Aqua':
      return enemy.aquaResistance
    case 'Geo':
      return enemy.geoResistance
    case 'Aero':
      return enemy.aeroResistance
    case 'Volt':
      return enemy.voltResistance
    default:
      return 0
  }
}

// ============================================================================
// DAMAGE CALCULATION
// ============================================================================

/**
 * Determine if resistance is negative
 */
function isNegativeResistance(resistance: number): number {
  return resistance < 0 ? 1 : 0
}

/**
 * Determine if resistance is >= 75%
 */
function isHighResistance(resistance: number): number {
  return resistance >= 75 ? 1 : 0
}

/**
 * Calculate total resistance after buffs/debuffs
 */
function calculateTotalResistance(
  baseResistance: number,
  isElemental: number,
  resistanceBuffs: number,
  resistanceDebuffs: number
): number {
  // R = (1 − e)(Rp + rp+ + rp−) + e(Re + re+ + re−)
  const totalResistance = baseResistance + resistanceBuffs + resistanceDebuffs
  return totalResistance
}

/**
 * Calculate damage from formula
 * Formula breakdown:
 * d/100 × [ (1 + a/100)^b + A ] × (1 + C/100)^x
 * × [ 1 − (R/100)(1/2)^(1 − iₐ) ]^(1 − iₐ)
 * × ( 100 / (4R + 100) )^iₐ
 * × ( Lₑ + 100 ) / [ (1 − D)(Lₑ + 100) + (L_c + 100) ]
 * × elementAdvantageMultiplier
 */
export async function calculateDamage(
  attacker: CombatStats,
  target: EnemyStats,
  talentMultiplier: number = 100, // d
  critRoll: number = 0, // x (0 or 1)
  elementAdvantage: number = 1 // element advantage multiplier
): Promise<DamageResult> {
  const breakdown: string[] = []

  try {
    // ========== STEP 1: Determine element type ==========
    const isElemental = 1 // Assuming all attacks are elemental for now
    breakdown.push(`Element: ${attacker.element} (isElemental: ${isElemental})`)

    // ========== STEP 2: Calculate base ATK ==========
    // ATK = base * (1 + a/100)^b + A
    const atkMultiplier = Math.pow(1 + attacker.atkPercent / 100, attacker.baseAtk)
    const baseAtk = atkMultiplier + attacker.flatAtkBonus
    breakdown.push(`Base ATK: ((1 + ${attacker.atkPercent}/100)^${attacker.baseAtk}) + ${attacker.flatAtkBonus} = ${baseAtk.toFixed(2)}`)

    // ========== STEP 3: Apply talent multiplier ==========
    // d/100
    const talentFactor = talentMultiplier / 100
    breakdown.push(`Talent multiplier: ${talentMultiplier}/100 = ${talentFactor.toFixed(2)}`)

    // ========== STEP 4: Calculate base damage ==========
    let baseDamage = baseAtk * talentFactor
    breakdown.push(`Base damage after talent: ${baseDamage.toFixed(2)}`)

    // ========== STEP 5: Get resistance value ==========
    const baseResistance = getResistanceByElement(target, attacker.element)
    const totalResistance = calculateTotalResistance(
      baseResistance,
      isElemental,
      target.resistanceBuffs,
      target.resistanceDebuffs
    )

    const l1 = isNegativeResistance(totalResistance)
    const l2 = isHighResistance(totalResistance)
    const iA = l1 // iₐ = l1 (negative resistance indicator)

    breakdown.push(
      `Resistance: ${totalResistance.toFixed(2)}% (l1: ${l1}, l2: ${l2}, iₐ: ${iA})`
    )

    // ========== STEP 6: Apply crit damage ==========
    let critFactor = 1.0
    if (critRoll === 1) {
      critFactor = 1 + attacker.critDamage / 100
      baseDamage = baseDamage * critFactor
      breakdown.push(`Crit applied: ${attacker.critDamage}% → ${critFactor.toFixed(2)}x multiplier`)
    }

    // ========== STEP 7: Resistance reduction ==========
    // [ 1 − (R/100)(1/2)^(1 − iₐ) ]^(1 − iₐ)
    const baseResistanceFactor = (totalResistance / 100) * Math.pow(0.5, 1 - iA)
    const resistanceFactor = Math.pow(1 - baseResistanceFactor, 1 - iA)
    breakdown.push(
      `Resistance factor: [ 1 − (${totalResistance}/100) × 0.5^(1−${iA}) ]^(1−${iA}) = ${resistanceFactor.toFixed(2)}`
    )

    // ========== STEP 8: Additional resistance penalty ==========
    // ( 100 / (4R + 100) )^iₐ
    const additionalResistancePenalty = Math.pow(100 / (4 * totalResistance + 100), iA)
    breakdown.push(
      `Additional resistance penalty: (100 / (4×${totalResistance} + 100))^${iA} = ${additionalResistancePenalty.toFixed(2)}`
    )

    // ========== STEP 9: Level scaling ==========
    // Simpler formula: higher character level = more damage
    // levelScaling = (100 + attacker.level) / (100 + target.level)
    const levelScaling = (100 + attacker.level) / (100 + target.level)

    breakdown.push(
      `Level scaling: (100 + ${attacker.level}) / (100 + ${target.level}) = ${levelScaling.toFixed(4)}`
    )

    // ========== STEP 10: Apply element advantage ==========
    breakdown.push(`Element advantage multiplier: ${elementAdvantage.toFixed(2)}x`)

    // ========== STEP 11: Final damage calculation ==========
    const finalDamage = Math.floor(
      baseDamage * resistanceFactor * additionalResistancePenalty * levelScaling * elementAdvantage
    )

    breakdown.push(`Final damage: ${baseDamage.toFixed(2)} × ${resistanceFactor.toFixed(2)} × ${additionalResistancePenalty.toFixed(2)} × ${levelScaling.toFixed(4)} × ${elementAdvantage.toFixed(2)} = ${finalDamage}`)

    return {
      baseDamage: Math.floor(baseDamage),
      finalDamage,
      critDamage: critRoll === 1 ? Math.floor(baseDamage * critFactor) : 0,
      resistanceReduction: totalResistance,
      defenseReduction: 0,
      multiplier: resistanceFactor * additionalResistancePenalty * levelScaling * elementAdvantage,
      breakdown,
    }
  } catch (err) {
    breakdown.push(`Error calculating damage: ${err}`)
    return {
      baseDamage: 0,
      finalDamage: 0,
      critDamage: 0,
      resistanceReduction: 0,
      defenseReduction: 0,
      multiplier: 0,
      breakdown,
    }
  }
}

// ============================================================================
// CLASS DEFINITIONS & UNLOCKS
// ============================================================================

/**
 * Class unlock requirements and base stats
 */
export interface ClassUnlock {
  class: ClassType
  requiredLevel: number
  baseStats: Partial<CombatStats>
}

export const CLASS_UNLOCKS: ClassUnlock[] = [
  {
    class: 'Swordsman',
    requiredLevel: 1,
    baseStats: {
      baseAtk: 25,
      atkPercent: 10,
      critDamage: 50,
      defense: 15,
      hp: 100,
    },
  },
  {
    class: 'Archer',
    requiredLevel: 15,
    baseStats: {
      baseAtk: 20,
      atkPercent: 15,
      critDamage: 75,
      defense: 10,
      hp: 85,
    },
  },
  {
    class: 'Spear',
    requiredLevel: 20,
    baseStats: {
      baseAtk: 22,
      atkPercent: 12,
      critDamage: 55,
      defense: 18,
      hp: 110,
    },
  },
  {
    class: 'Mage',
    requiredLevel: 25,
    baseStats: {
      baseAtk: 18,
      atkPercent: 20,
      critDamage: 60,
      defense: 8,
      hp: 80,
    },
  },
  {
    class: 'Ranger',
    requiredLevel: 30,
    baseStats: {
      baseAtk: 21,
      atkPercent: 14,
      critDamage: 70,
      defense: 12,
      hp: 95,
    },
  },
]

export const CLASS_STATS: Record<ClassType, Partial<CombatStats>> = {
  Swordsman: {
    baseAtk: 25,
    atkPercent: 10,    flatAtkBonus: 8,    critDamage: 50,
    defense: 15,
    hp: 100,
  },
  Archer: {
    baseAtk: 20,
    atkPercent: 15,
    flatAtkBonus: 9,
    critDamage: 75,
    defense: 10,
    hp: 85,
  },
  Spear: {
    baseAtk: 22,
    atkPercent: 12,
    flatAtkBonus: 10,
    critDamage: 55,
    defense: 18,
    hp: 110,
  },
  Mage: {
    baseAtk: 18,
    atkPercent: 20,
    flatAtkBonus: 12,
    critDamage: 60,
    defense: 8,
    hp: 80,
  },
  Ranger: {
    baseAtk: 21,
    atkPercent: 14,
    flatAtkBonus: 9,
    critDamage: 70,
    defense: 12,
    hp: 95,
  },
}

/**
 * Get available classes for a given level
 */
export function getAvailableClasses(level: number): ClassType[] {
  return CLASS_UNLOCKS
    .filter((unlock) => unlock.requiredLevel <= level)
    .map((unlock) => unlock.class)
}

/**
 * Get required level for a class
 */
export function getClassRequiredLevel(classType: ClassType): number {
  const unlock = CLASS_UNLOCKS.find((u) => u.class === classType)
  return unlock?.requiredLevel ?? 1
}

/**
 * Apply equipment bonuses to stats
 */
export function applyEquipmentBonuses(stats: CombatStats, equipments: Equipment[] = []): CombatStats {
  const modified = { ...stats }
  for (const eq of equipments) {
    modified.flatAtkBonus += eq.atkBonus
    modified.atkPercent += eq.atkPercentBonus
    modified.critDamage += eq.critDamageBonus
    modified.elementalDamageBonus += eq.elementalDamageBonusBonus
    modified.defense += eq.defenseBonus
    modified.hp += eq.hpBonus
  }
  return modified
}

export function getClassStats(classType: ClassType): Partial<CombatStats> {
  return CLASS_STATS[classType]
}
