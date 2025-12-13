import { Config, Cmd, BaseCommand } from '../../base'
import { Whatsapp } from 'violet'
import { LevelingStore } from '../../database/postgres/leveling'
import { computeLevel, statusTitle, nextStatusKey, getBracket } from '../../utils/leveling'

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }

  @Cmd('(promosi)', {
    as: ['promosi'],
    description: 'Naik status bila sudah memenuhi level',
    usePrefix: true,
    division: 'helper',
    acc: { owner: false },
    help: 'promote',
  })
  async promote() {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return this.replyText('POSTGRES_URL belum di-set. Tambahkan ke environment.')

    try {
      const store = await LevelingStore.getInstance(POSTGRES_URL)
      const jid = this.M.sender as string
      const player = await store.getPlayer(jid)
      if (!player || !player.is_registered) {
        return this.replyText('Kamu belum terdaftar. Gunakan ?register <nama> <male|female> untuk mendaftar.')
      }

      const currentBracket = getBracket(player.status_key)
      if (!currentBracket) return this.replyText('Status kamu tidak dikenali. Hubungi admin.')
      const nextKey = nextStatusKey(player.status_key)
      if (!nextKey) return this.replyText('Kamu sudah di status tertinggi.')
      const nextBracket = getBracket(nextKey)
      if (!nextBracket) return this.replyText('Status berikutnya tidak ditemukan. Hubungi admin.')

      const theoreticalLevel = computeLevel(Number(player.exp))
      if (theoreticalLevel < nextBracket.minLevel) {
        return this.replyText(
          `Level kamu belum cukup untuk promosi. Level teoritis: ${theoreticalLevel}, butuh >= ${nextBracket.minLevel}.`
        )
      }

      if (player.streak < nextBracket.streakReq) {
        return this.replyText(
          `Streak harian belum cukup. Kamu punya ${player.streak}, butuh >= ${nextBracket.streakReq}.`
        )
      }

      if (player.coins < nextBracket.coinCost) {
        return this.replyText(
          `Koin belum cukup. Kamu punya ${player.coins}, butuh ${nextBracket.coinCost} untuk promosi.`
        )
      }

      const result = await store.promote(jid)
      if (!result) return this.replyText('Promosi gagal. Coba lagi nanti.')

      const display = statusTitle(result.player.status_key, result.player.gender)
      const lines = [
        '🎉 Promosi berhasil!',
        `Status baru: ${display}`,
        `Level sekarang: ${result.player.level} (cap ${result.player.bracket_max_level})`,
      ]
      return this.replyText(lines.join('\n'))
    } catch (err: any) {
      return this.replyText(`Promosi gagal: ${err?.message || err}`)
    }
  }
}
