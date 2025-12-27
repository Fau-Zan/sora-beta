import { PostgresBase } from './postgres'

export type Fable = {
  id: number
  name: string
  lore: string
  min_level: number
  condition_type: 'level' | 'suit_wins' | 'gems_earned' | 'streak' | 'days_played'
  condition_value: number
  reward_coins: number
  reward_gems: number
  buff_type: 'coin_earn' | 'exp_earn' | 'gem_drop' | 'win_rate'
  buff_value: number
  created_at: Date
}

export type PlayerFable = {
  jid: string
  fable_id: number
  triggered_at: Date | null
  claimed_at: Date | null
  active: boolean
}

let singleton: FableStore | null = null

export class FableStore extends PostgresBase {
  private initialized = false

  constructor(connectionString: string) {
    super({ connectionString })
  }

  static async getInstance(connectionString: string): Promise<FableStore> {
    if (singleton) return singleton
    singleton = new FableStore(connectionString)
    await singleton.connect()
    await singleton.init()
    return singleton
  }

  async init() {
    if (this.initialized) return

    await this.ensureTable(
      'fables',
      `
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        lore TEXT NOT NULL,
        min_level INT NOT NULL DEFAULT 1,
        condition_type TEXT NOT NULL CHECK (condition_type IN ('level','suit_wins','gems_earned','streak','days_played')),
        condition_value INT NOT NULL,
        reward_coins INT NOT NULL DEFAULT 0,
        reward_gems INT NOT NULL DEFAULT 0,
        buff_type TEXT NOT NULL CHECK (buff_type IN ('coin_earn','exp_earn','gem_drop','win_rate')),
        buff_value INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT now()
      `
    )

    await this.ensureTable(
      'player_fables',
      `
        jid TEXT NOT NULL,
        fable_id INT NOT NULL REFERENCES fables(id),
        triggered_at TIMESTAMP,
        claimed_at TIMESTAMP,
        active BOOLEAN NOT NULL DEFAULT false,
        PRIMARY KEY (jid, fable_id)
      `
    )
    await this.seedFables()
    this.initialized = true
  }

  private async seedFables() {
    const defaultFables = [
      {
        name: 'The Lost Coin',
        lore: 'Kamu membantu seorang pedagang tua menemukan koin yang hilang. Sebuah berkah keberuntungan diberikan padamu.',
        min_level: 1,
        condition_type: 'suit_wins',
        condition_value: 5,
        reward_coins: 50,
        reward_gems: 0,
        buff_type: 'coin_earn',
        buff_value: 5,
      },
      {
        name: 'Warrior\'s Trial',
        lore: 'Kamu melatih diri dengan para prajurit desa. Kekuatan dan kebijaksanaan mulai mengalir dalam dirimu.',
        min_level: 10,
        condition_type: 'level',
        condition_value: 10,
        reward_coins: 100,
        reward_gems: 0,
        buff_type: 'exp_earn',
        buff_value: 10,
      },
      {
        name: 'Gem of Destiny',
        lore: 'Di dalam gua gelap, kamu menemukan permata mistis yang bersinar. Daya tarik keberuntungan meningkat.',
        min_level: 20,
        condition_type: 'gems_earned',
        condition_value: 10,
        reward_coins: 150,
        reward_gems: 10,
        buff_type: 'gem_drop',
        buff_value: 1,
      },
      {
        name: 'Champion\'s Path',
        lore: 'Setelah bermacam-macam pertarungan, kamu diakui sebagai pejuang sejati.',
        min_level: 30,
        condition_type: 'suit_wins',
        condition_value: 20,
        reward_coins: 300,
        reward_gems: 15,
        buff_type: 'win_rate',
        buff_value: 5,
      },
      {
        name: 'The Eternal Streak',
        lore: 'Konsistensi dan dedikasi membawamu ke puncak kesuksesan. Takdir berubah untuk menguntungkan.',
        min_level: 40,
        condition_type: 'streak',
        condition_value: 50,
        reward_coins: 500,
        reward_gems: 20,
        buff_type: 'exp_earn',
        buff_value: 15,
      },
    ]

    for (const fable of defaultFables) {
      await this.query(
        `INSERT INTO fables (name, lore, min_level, condition_type, condition_value, reward_coins, reward_gems, buff_type, buff_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (name) DO NOTHING`,
        [
          fable.name,
          fable.lore,
          fable.min_level,
          fable.condition_type,
          fable.condition_value,
          fable.reward_coins,
          fable.reward_gems,
          fable.buff_type,
          fable.buff_value,
        ]
      )
    }
  }

  async getAllFables(): Promise<Fable[]> {
    const res = await this.query('SELECT * FROM fables ORDER BY min_level ASC')
    return res.rows as Fable[]
  }

  async getPlayerFables(jid: string): Promise<PlayerFable[]> {
    const res = await this.query('SELECT * FROM player_fables WHERE jid = $1', [jid])
    return res.rows as PlayerFable[]
  }

  async checkAndTriggerFable(
    jid: string,
    triggerType: 'level' | 'suit_wins' | 'gems_earned' | 'streak' | 'days_played',
    triggerValue: number
  ): Promise<Fable | null> {
    const fables = await this.getAllFables()
    const playerFables = await this.getPlayerFables(jid)
    const triggeredIds = new Set(playerFables.map(pf => pf.fable_id))

    for (const fable of fables) {
      if (triggeredIds.has(fable.id)) continue
      if (fable.condition_type !== triggerType) continue
      if (triggerValue < fable.condition_value) continue

      await this.query(
        `INSERT INTO player_fables (jid, fable_id, triggered_at)
         VALUES ($1, $2, now())
         ON CONFLICT (jid, fable_id) DO NOTHING`,
        [jid, fable.id]
      )

      return fable
    }

    return null
  }

  async claimFable(jid: string, fableId: number): Promise<Fable | null> {
    const fableRes = await this.query('SELECT * FROM fables WHERE id = $1', [fableId])
    if (fableRes.rowCount === 0) return null

    const fable = fableRes.rows[0] as Fable
    await this.query(
      `UPDATE player_fables SET claimed_at = now(), active = true WHERE jid = $1 AND fable_id = $2`,
      [jid, fableId]
    )

    return fable
  }

  async getActiveFableBuffs(jid: string): Promise<{ [key: string]: number }> {
    const res = await this.query(
      `SELECT buff_type, buff_value FROM player_fables pf
       JOIN fables f ON pf.fable_id = f.id
       WHERE pf.jid = $1 AND pf.active = true`,
      [jid]
    )

    const buffs: { [key: string]: number } = {}
    for (const row of res.rows) {
      buffs[row.buff_type] = (buffs[row.buff_type] || 0) + row.buff_value
    }
    return buffs
  }

  async giveFableToUser(jid: string, fableId: number): Promise<boolean> {
    try {
      await this.query(
        `INSERT INTO player_fables (jid, fable_id, triggered_at, active)
         VALUES ($1, $2, now(), true)
         ON CONFLICT (jid, fable_id) DO UPDATE SET triggered_at = now(), active = true`,
        [jid, fableId]
      )
      return true
    } catch (err) {
      return false
    }
  }
}

let fableStoreInstance: FableStore | null = null

export async function getFableStore(): Promise<FableStore> {
  const POSTGRES_URL = process.env.POSTGRES_URL
  if (!POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set')
  }
  if (fableStoreInstance) return fableStoreInstance
  fableStoreInstance = await FableStore.getInstance(POSTGRES_URL)
  return fableStoreInstance
}
