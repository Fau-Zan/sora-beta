import { PoolClient } from 'pg'
import { PostgresBase } from './postgres'
import {
  STATUS_BRACKETS,
  Gender,
  computeLevel,
  clampLevel,
  statusTitle,
  nextStatusKey,
  getBracket,
  CUM_EXP,
} from '../../utils/leveling'

export type PlayerRow = {
  jid: string
  is_registered: boolean
  name: string
  gender: Gender
  exp: number
  level: number
  status_key: string
  status_display: string
  bracket_max_level: number
  streak: number
  coins: number
  gems: number
  suit_wins: number
  last_seen: Date | null
  registered_at: Date | null
  updated_at: Date | null
}

let singleton: LevelingStore | null = null

export class LevelingStore extends PostgresBase {
  private initialized = false

  constructor(connectionString: string) {
    super({ connectionString })
  }

  static async getInstance(connectionString: string): Promise<LevelingStore> {
    if (singleton) return singleton
    singleton = new LevelingStore(connectionString)
    await singleton.connect()
    await singleton.init()
    return singleton
  }

  async init() {
    if (this.initialized) return

    await this.ensureTable(
      'status_brackets',
      `
        status_key TEXT PRIMARY KEY,
        male_title TEXT NOT NULL,
        female_title TEXT NOT NULL,
        min_level INT NOT NULL,
        max_level INT NOT NULL,
        coin_cost INT NOT NULL DEFAULT 0,
        streak_req INT NOT NULL DEFAULT 0
      `
    )

    await this.ensureTable(
      'players',
      `
        jid TEXT PRIMARY KEY,
        is_registered BOOLEAN NOT NULL DEFAULT false,
        name TEXT NOT NULL,
        gender TEXT NOT NULL CHECK (gender IN ('male','female')),
        exp BIGINT NOT NULL DEFAULT 0,
        level INT NOT NULL DEFAULT 1,
        status_key TEXT NOT NULL DEFAULT 'serf' REFERENCES status_brackets(status_key),
        status_display TEXT NOT NULL,
        bracket_max_level INT NOT NULL DEFAULT 4,
        streak INT NOT NULL DEFAULT 0,
        coins BIGINT NOT NULL DEFAULT 0,
        last_seen TIMESTAMP,
        registered_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        CHECK (exp >= 0),
        CHECK (level >= 1)
      `
    )

    await this.query(
      `ALTER TABLE players
         ADD COLUMN IF NOT EXISTS gems INT NOT NULL DEFAULT 0`
    )

    await this.query(
      `ALTER TABLE players
         ADD COLUMN IF NOT EXISTS suit_wins INT NOT NULL DEFAULT 0`
    )

    await this.ensureTable(
      'player_events',
      `
        id BIGSERIAL PRIMARY KEY,
        jid TEXT NOT NULL,
        type TEXT NOT NULL,
        exp_delta INT DEFAULT 0,
        coin_delta INT DEFAULT 0,
        meta JSONB,
        created_at TIMESTAMP DEFAULT now()
      `
    )

    await this.ensureIndexes('players', [{ columns: ['status_key'] }])
    await this.ensureIndexes('player_events', [{ columns: ['jid', 'created_at'] }])

    for (const s of STATUS_BRACKETS) {
      await this.query(
        `INSERT INTO status_brackets (status_key, male_title, female_title, min_level, max_level, coin_cost, streak_req)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (status_key) DO UPDATE SET
           male_title = EXCLUDED.male_title,
           female_title = EXCLUDED.female_title,
           min_level = EXCLUDED.min_level,
           max_level = EXCLUDED.max_level,
           coin_cost = EXCLUDED.coin_cost,
           streak_req = EXCLUDED.streak_req`,
        [s.statusKey, s.maleTitle, s.femaleTitle, s.minLevel, s.maxLevel, s.coinCost, s.streakReq]
      )
    }

    this.initialized = true
  }

  async registerPlayer(jid: string, name: string, gender: Gender): Promise<PlayerRow> {
    await this.connect()
    await this.init()
    const baseStatus = STATUS_BRACKETS[0]
    const display = statusTitle(baseStatus.statusKey, gender)

    await this.query(
      `INSERT INTO players (jid, is_registered, name, gender, exp, level, status_key, status_display, bracket_max_level, streak, coins, last_seen)
       VALUES ($1, true, $2, $3, 0, 1, $4, $5, $6, 0, 0, now())
       ON CONFLICT (jid) DO UPDATE SET
         is_registered = true,
         name = EXCLUDED.name,
         gender = EXCLUDED.gender,
         status_key = players.status_key,
         status_display = players.status_display,
         bracket_max_level = players.bracket_max_level,
         coins = players.coins,
         updated_at = now()
       RETURNING *`,
      [jid, name, gender, baseStatus.statusKey, display, baseStatus.maxLevel]
    )

    return (await this.getPlayer(jid))!
  }

  async getPlayer(jid: string): Promise<PlayerRow | null> {
    const res = await this.query(`SELECT * FROM players WHERE jid = $1`, [jid])
    return (res.rows[0] as PlayerRow) ?? null
  }

  private async logEvent(client: PoolClient, jid: string, type: string, expDelta = 0, coinDelta = 0, meta?: any) {
    await client.query(
      `INSERT INTO player_events (jid, type, exp_delta, coin_delta, meta) VALUES ($1,$2,$3,$4,$5)` ,
      [jid, type, expDelta, coinDelta, meta ?? null]
    )
  }

  async addExp(jid: string, expDelta: number, streakDelta = 0, coinDelta = 0): Promise<PlayerRow | null> {
    if (!expDelta && !streakDelta && !coinDelta) return this.getPlayer(jid)
    await this.connect()
    await this.init()

    return this.transaction<PlayerRow | null>(async (client) => {
      const res = await client.query(`SELECT * FROM players WHERE jid = $1 FOR UPDATE`, [jid])
      if (res.rowCount === 0) return null
      const player = res.rows[0] as PlayerRow
      const newExp = Math.max(0, Number(player.exp) + expDelta)
      const theoreticalLevel = computeLevel(newExp)
      const cappedLevel = clampLevel(theoreticalLevel, player.status_key)

      const updated = await client.query(
        `UPDATE players
         SET exp = $1,
             level = $2,
             streak = GREATEST(0, streak + $3),
             coins = GREATEST(0, coins + $4),
             updated_at = now(),
             last_seen = now()
         WHERE jid = $5
         RETURNING *`,
        [newExp, cappedLevel, streakDelta, coinDelta, jid]
      )

      await this.logEvent(client, jid, 'exp_award', expDelta, coinDelta, { streakDelta })
      return updated.rows[0] as PlayerRow
    })
  }

  async promote(jid: string): Promise<{ player: PlayerRow; promotedTo: string } | null> {
    await this.connect()
    await this.init()

    return this.transaction(async (client) => {
      const res = await client.query(`SELECT * FROM players WHERE jid = $1 FOR UPDATE`, [jid])
      if (res.rowCount === 0) return null
      const player = res.rows[0] as PlayerRow
      const currentBracket = getBracket(player.status_key)
      const nextKey = nextStatusKey(player.status_key)
      if (!currentBracket || !nextKey) return null
      const nextBracket = getBracket(nextKey)
      if (!nextBracket) return null

      const theoreticalLevel = computeLevel(Number(player.exp))
      if (theoreticalLevel < nextBracket.minLevel) {
        throw new Error(`Belum memenuhi level untuk promosi (butuh >= ${nextBracket.minLevel})`)
      }

      if (player.streak < nextBracket.streakReq) {
        throw new Error(`Streak harian belum cukup (butuh >= ${nextBracket.streakReq})`)
      }

      if (player.coins < nextBracket.coinCost) {
        throw new Error(`Koin belum cukup (butuh ${nextBracket.coinCost}, kamu punya ${player.coins})`)
      }

      const newLevel = clampLevel(theoreticalLevel, nextBracket.statusKey)
      const display = statusTitle(nextBracket.statusKey, player.gender)

      const updated = await client.query(
        `UPDATE players
         SET status_key = $1,
             status_display = $2,
             bracket_max_level = $3,
             level = $4,
             coins = coins - $6,
             updated_at = now()
         WHERE jid = $5
         RETURNING *`,
        [nextBracket.statusKey, display, nextBracket.maxLevel, newLevel, jid, nextBracket.coinCost]
      )

      await this.logEvent(client, jid, 'promotion', 0, -nextBracket.coinCost, { from: player.status_key, to: nextBracket.statusKey })
      return { player: updated.rows[0] as PlayerRow, promotedTo: nextBracket.statusKey }
    })
  }

  async adminAdjust(
    jid: string,
    opts: { level?: number; coins?: number; gems?: number; suit_wins?: number; statusKey?: string; streak?: number; exp?: number }
  ): Promise<PlayerRow | null> {
    await this.connect()
    await this.init()

    return this.transaction(async (client) => {
      const res = await client.query(`SELECT * FROM players WHERE jid = $1 FOR UPDATE`, [jid])
      if (res.rowCount === 0) return null
      const player = res.rows[0] as PlayerRow

      const targetStatusKey = opts.statusKey ?? player.status_key
      const bracket = getBracket(targetStatusKey)
      if (!bracket) throw new Error('Status tidak valid')

      const levelInput = opts.level ?? player.level
      const maxLevelIndex = CUM_EXP.length - 1
      const targetLevelRaw = Math.max(1, Math.min(levelInput, maxLevelIndex))
      const targetLevel = clampLevel(targetLevelRaw, targetStatusKey)

      const nextExp = opts.exp !== undefined ? Math.max(0, opts.exp) : CUM_EXP[targetLevel]
      const nextCoins = opts.coins !== undefined ? Math.max(0, opts.coins) : player.coins
      const nextGems = opts.gems !== undefined ? Math.max(0, opts.gems) : player.gems
      const nextSuitWins = opts.suit_wins !== undefined ? Math.max(0, opts.suit_wins) : player.suit_wins
      const nextStreak = opts.streak !== undefined ? Math.max(0, opts.streak) : player.streak
      const display = statusTitle(targetStatusKey, player.gender)

      const updated = await client.query(
        `UPDATE players
         SET level = $1,
             exp = $2,
             coins = $3,
             gems = $4,
             suit_wins = $5,
             streak = $6,
             status_key = $7,
             status_display = $8,
             bracket_max_level = $9,
             updated_at = now()
         WHERE jid = $10
         RETURNING *`,
        [targetLevel, nextExp, nextCoins, nextGems, nextSuitWins, nextStreak, targetStatusKey, display, bracket.maxLevel, jid]
      )

      await this.logEvent(client, jid, 'admin_adjust', 0, 0, opts)
      return updated.rows[0] as PlayerRow
    })
  }
}
let levelingStoreInstance: LevelingStore | null = null

export async function getLevelingStore(): Promise<LevelingStore> {
  const POSTGRES_URL = process.env.POSTGRES_URL
  if (!POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set')
  }
  if (levelingStoreInstance) return levelingStoreInstance
  levelingStoreInstance = await LevelingStore.getInstance(POSTGRES_URL)
  return levelingStoreInstance
}