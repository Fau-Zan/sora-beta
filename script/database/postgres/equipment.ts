/**
 * Equipment Store - PostgreSQL
 * Manages character equipment and inventory
 */

import { PoolClient } from 'pg'
import { PostgresBase } from './postgres'
import { Equipment, Rarity } from '../../utils/formula'

export type EquipmentRow = {
  id: string
  jid: string
  name: string
  type: 'weapon' | 'armor' | 'accessory'
  rarity: Rarity
  atk_bonus: number
  defense_bonus: number
  hp_bonus: number
  crit_damage_bonus: number
  atk_percent_bonus: number
  element_bonus: string | null
  elemental_damage_bonus_bonus: number
  is_equipped: boolean
  acquired_at: Date
}

export type CharacterClassRow = {
  jid: string
  current_class: string
  selected_element: string | null
  level: number
  equipped_weapon: string | null
  equipped_armor: string | null
  equipped_accessory: string | null
  created_at: Date
  updated_at: Date
}

let singleton: EquipmentStore | null = null

export class EquipmentStore extends PostgresBase {
  private initialized = false

  constructor(connectionString: string) {
    super({ connectionString })
  }

  static async getInstance(connectionString: string): Promise<EquipmentStore> {
    if (singleton) return singleton
    singleton = new EquipmentStore(connectionString)
    await singleton.connect()
    await singleton.init()
    return singleton
  }

  async init() {
    if (this.initialized) return

    // Equipment inventory
    await this.ensureTable(
      'equipment',
      `
        id TEXT PRIMARY KEY,
        jid TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'accessory')),
        rarity TEXT NOT NULL CHECK (rarity IN ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary')),
        atk_bonus INT NOT NULL DEFAULT 0,
        defense_bonus INT NOT NULL DEFAULT 0,
        hp_bonus INT NOT NULL DEFAULT 0,
        crit_damage_bonus INT NOT NULL DEFAULT 0,
        atk_percent_bonus INT NOT NULL DEFAULT 0,
        element_bonus TEXT,
        elemental_damage_bonus_bonus INT NOT NULL DEFAULT 0,
        is_equipped BOOLEAN NOT NULL DEFAULT false,
        acquired_at TIMESTAMP DEFAULT now(),
        FOREIGN KEY (jid) REFERENCES players(jid) ON DELETE CASCADE
      `
    )

    // Character class and equipped items
    await this.ensureTable(
      'character_class',
      `
        jid TEXT PRIMARY KEY,
        current_class TEXT,
        selected_element TEXT CHECK (selected_element IN ('Pyro', 'Aqua', 'Geo', 'Aero', 'Volt', null)),
        level INT NOT NULL DEFAULT 1,
        equipped_weapon TEXT,
        equipped_armor TEXT,
        equipped_accessory TEXT,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        FOREIGN KEY (jid) REFERENCES players(jid) ON DELETE CASCADE,
        FOREIGN KEY (equipped_weapon) REFERENCES equipment(id),
        FOREIGN KEY (equipped_armor) REFERENCES equipment(id),
        FOREIGN KEY (equipped_accessory) REFERENCES equipment(id)
      `
    )

    // Create index for faster queries
    await this.query(`CREATE INDEX IF NOT EXISTS idx_equipment_jid ON equipment(jid)`)
    await this.query(`CREATE INDEX IF NOT EXISTS idx_equipment_equipped ON equipment(is_equipped) WHERE is_equipped = true`)

    this.initialized = true
  }

  /**
   * Add equipment to character inventory
   */
  async addEquipment(jid: string, equipment: Equipment): Promise<void> {
    const query = `
      INSERT INTO equipment (id, jid, name, type, rarity, atk_bonus, defense_bonus, 
                            hp_bonus, crit_damage_bonus, atk_percent_bonus, 
                            element_bonus, elemental_damage_bonus_bonus)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO NOTHING
    `
    await this.query(query, [
      equipment.id,
      jid,
      equipment.name,
      equipment.type,
      equipment.rarity,
      equipment.atkBonus,
      equipment.defenseBonus,
      equipment.hpBonus,
      equipment.critDamageBonus,
      equipment.atkPercentBonus,
      equipment.elementBonus || null,
      equipment.elementalDamageBonusBonus,
    ])
  }

  /**
   * Get character's inventory
   */
  async getInventory(jid: string): Promise<Equipment[]> {
    const result = await this.query(
      `SELECT * FROM equipment WHERE jid = $1 ORDER BY acquired_at DESC`,
      [jid]
    )
    return result.rows.map((row: EquipmentRow) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      rarity: row.rarity,
      atkBonus: row.atk_bonus,
      defenseBonus: row.defense_bonus,
      hpBonus: row.hp_bonus,
      critDamageBonus: row.crit_damage_bonus,
      atkPercentBonus: row.atk_percent_bonus,
      elementBonus: row.element_bonus as any,
      elementalDamageBonusBonus: row.elemental_damage_bonus_bonus,
    }))
  }

  /**
   * Get equipped items
   */
  async getEquippedItems(jid: string): Promise<{ weapon?: Equipment; armor?: Equipment; accessory?: Equipment }> {
    const result = await this.query(
      `SELECT equipped_weapon, equipped_armor, equipped_accessory FROM character_class WHERE jid = $1`,
      [jid]
    )

    if (result.rows.length === 0) {
      return {}
    }

    const row = result.rows[0]
    const equipped: any = {}

    if (row.equipped_weapon) {
      const weaponData = await this.query(`SELECT * FROM equipment WHERE id = $1`, [row.equipped_weapon])
      if (weaponData.rows.length > 0) {
        equipped.weapon = this.rowToEquipment(weaponData.rows[0])
      }
    }

    if (row.equipped_armor) {
      const armorData = await this.query(`SELECT * FROM equipment WHERE id = $1`, [row.equipped_armor])
      if (armorData.rows.length > 0) {
        equipped.armor = this.rowToEquipment(armorData.rows[0])
      }
    }

    if (row.equipped_accessory) {
      const accessoryData = await this.query(`SELECT * FROM equipment WHERE id = $1`, [row.equipped_accessory])
      if (accessoryData.rows.length > 0) {
        equipped.accessory = this.rowToEquipment(accessoryData.rows[0])
      }
    }

    return equipped
  }

  /**
   * Equip item
   */
  async equipItem(jid: string, equipmentId: string): Promise<boolean> {
    // Get equipment type
    const eqResult = await this.query(`SELECT type FROM equipment WHERE id = $1 AND jid = $2`, [
      equipmentId,
      jid,
    ])

    if (eqResult.rows.length === 0) return false

    const type = eqResult.rows[0].type
    const column = `equipped_${type}`

    // Update equipment
    await this.query(`UPDATE character_class SET ${column} = $1, updated_at = now() WHERE jid = $2`, [
      equipmentId,
      jid,
    ])

    return true
  }

  /**
   * Unequip item
   */
  async unequipItem(jid: string, type: 'weapon' | 'armor' | 'accessory'): Promise<void> {
    const column = `equipped_${type}`
    await this.query(`UPDATE character_class SET ${column} = null, updated_at = now() WHERE jid = $1`, [jid])
  }

  /**
   * Set character class
   */
  async setClass(jid: string, classType: string): Promise<void> {
    const query = `
      INSERT INTO character_class (jid, current_class)
      VALUES ($1, $2)
      ON CONFLICT (jid) DO UPDATE SET
        current_class = $2,
        updated_at = now()
    `
    await this.query(query, [jid, classType])
  }

  /**
   * Set character element
   */
  async setElement(jid: string, element: string | null): Promise<void> {
    const query = `
      INSERT INTO character_class (jid, selected_element)
      VALUES ($1, $2)
      ON CONFLICT (jid) DO UPDATE SET
        selected_element = $2,
        updated_at = now()
    `
    await this.query(query, [jid, element])
  }

  /**
   * Get character class info
   */
  async getClassInfo(jid: string): Promise<CharacterClassRow | null> {
    const result = await this.query(`SELECT * FROM character_class WHERE jid = $1`, [jid])
    return result.rows[0] || null
  }

  /**
   * Helper: Convert DB row to Equipment interface
   */
  private rowToEquipment(row: EquipmentRow): Equipment {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      rarity: row.rarity,
      atkBonus: row.atk_bonus,
      defenseBonus: row.defense_bonus,
      hpBonus: row.hp_bonus,
      critDamageBonus: row.crit_damage_bonus,
      atkPercentBonus: row.atk_percent_bonus,
      elementBonus: row.element_bonus as any,
      elementalDamageBonusBonus: row.elemental_damage_bonus_bonus,
    }
  }
}

export async function getEquipmentStore(): Promise<EquipmentStore> {
  const POSTGRES_URL = process.env.POSTGRES_URL
  if (!POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set')
  }
  return EquipmentStore.getInstance(POSTGRES_URL)
}
