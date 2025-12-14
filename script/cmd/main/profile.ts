import { Config, Cmd, BaseCommand } from '../../base'
import { Whatsapp } from 'violet'
import { getLevelingStore } from '../../database/postgres/leveling'
import { computeLevel, CUM_EXP, REQUIRED_EXP, nextStatusKey, statusTitle, getBracket, getExpMultiplier } from '../../utils/leveling'

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }

  @Cmd('(profil|level)', {
    as: ['profil'],
    description: 'Lihat profil leveling',
    usePrefix: true,
    division: 'helper',
    acc: { owner: false },
  })
  async profile() {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return this.replyText('POSTGRES_URL belum di-set. Tambahkan ke environment.')

    try {
      const store = await getLevelingStore()
      const jid = this.M.sender as string
      const player = await store.getPlayer(jid)
      if (!player || !player.is_registered) {
        return this.replyText('Kamu belum terdaftar. Gunakan perintah register <nama> <male|female>.')
      }

      const theoreticalLevel = computeLevel(Number(player.exp))
      const currentBracket = getBracket(player.status_key)
      const nextKey = nextStatusKey(player.status_key)
      const nextBracket = nextKey ? getBracket(nextKey) : null
      const expMultiplier = getExpMultiplier(player.status_key)
      const baseExp = 12
      const buffedExp = Math.floor(baseExp * expMultiplier)

      const nextLevel = player.level + 1
      const expForNext = REQUIRED_EXP[nextLevel] ?? 0
      const expToNext = expForNext > 0 ? Math.max(0, expForNext + (CUM_EXP[nextLevel - 1] ?? 0) - Number(player.exp)) : 0

      const lines = [
        `📜 Profil Leveling`,
        `Nama: ${player.name}`,
        `Gender: ${player.gender}`,
        `Status: ${player.status_display}`,
        `Level: ${player.level} (teoritis ${theoreticalLevel}, cap ${player.bracket_max_level})`,
        `EXP: ${player.exp} (butuh ${expToNext} lagi ke level ${nextLevel})`,
        `Streak: ${player.streak}`,
        `Koin: ${player.coins ?? 0}`,
        `Buff EXP: ${baseExp}×${expMultiplier.toFixed(1)} = ${buffedExp}/msg`,
      ]

      if (nextBracket) {
        lines.push(
          `Next Status: ${statusTitle(nextBracket.statusKey, player.gender)} (syarat level ≥ ${nextBracket.minLevel}, streak ≥ ${nextBracket.streakReq}, koin ≥ ${nextBracket.coinCost})`
        )
      } else {
        lines.push('Next Status: -- tertinggi --')
      }

      return this.replyText(lines.join('\n'))
    } catch (err: any) {
      return this.replyText(`Gagal memuat profil: ${err?.message || err}`)
    }
  }
}
