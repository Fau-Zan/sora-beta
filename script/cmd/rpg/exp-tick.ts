import { Config, All, BaseCommand } from '../../base'
import { Whatsapp } from 'violet'
import { getLevelingStore } from '../../database/postgres/leveling'

const ALLOWED_MESSAGE_TYPES = new Set(['conversation', 'extendedTextMessage', 'imageMessage', 'videoMessage', 'audioMessage'])
const MIN_BODY_LENGTH = 3
const EXP_PER_MESSAGE = 12
const COIN_PER_MESSAGE = 1
const EXP_COOLDOWN_MS = 30_000

const LAST_EXP_AT = new Map<string, number>()

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }


  @All()
  async ExpTick() {
    const M = this.M
    if (!M?.sender || M.isBotSending) return
    if (!M.body || !M.type || !ALLOWED_MESSAGE_TYPES.has(M.type)) return
    if (M.body.length < MIN_BODY_LENGTH) return

    const now = Date.now()
    const last = LAST_EXP_AT.get(M.sender)

    if (last && now - last < EXP_COOLDOWN_MS) return
    LAST_EXP_AT.set(M.sender, now)

    try {
      const POSTGRES_URL = process.env.POSTGRES_URL
      if (!POSTGRES_URL) return

      const store = await getLevelingStore()
      const player = await store.getPlayer(M.sender as string)
      if (!player?.is_registered) return

      const { getExpMultiplier, applyFableBuffs } = await import('../../utils/leveling')
      const multiplier = getExpMultiplier(player.status_key)
      const scaledExp = Math.floor(EXP_PER_MESSAGE * multiplier)

      const { exp: finalExp, coins: finalCoins } = await applyFableBuffs(
        M.sender as string,
        scaledExp,
        COIN_PER_MESSAGE
      )

      await store.addExp(M.sender as string, finalExp, 1, finalCoins)
    } catch (err) {
    }
  }
}
