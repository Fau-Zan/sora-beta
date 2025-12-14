import { Config, Cmd, BaseCommand } from '../../base'
import { Whatsapp } from 'violet'
import { getLevelingStore } from '../../database/postgres/leveling'
import { STATUS_BRACKETS } from '../../utils/leveling'

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }

  private async applyAdjust(jid: string, patch: { level?: number; coins?: number; statusKey?: string; streak?: number; exp?: number }) {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return this.replyText('POSTGRES_URL belum di-set. Tambahkan ke environment.')

    try {
      const store = await getLevelingStore()
      if (patch.statusKey && !STATUS_BRACKETS.some((b) => b.statusKey === patch.statusKey)) {
        return this.replyText('Status tidak dikenal.')
      }

      const updated = await store.adminAdjust(jid, patch)
      if (!updated) return this.replyText('Player tidak ditemukan. Pastikan sudah register.')

      const lines = [
        `User @${updated.jid.split('@')[0]} di-update:`,
        `Status: ${updated.status_display} (${updated.status_key})`,
        `Level: ${updated.level} (cap ${updated.bracket_max_level})`,
        `EXP: ${updated.exp}`,
        `Coins: ${updated.coins}`,
        `Streak: ${updated.streak}`,
      ]
      return this.client.sendMessage<'conversation'>(this.M.from, lines.join('\n'), 'conversation', {
        quoted: this.M,
        mentions: [jid],
      })
    } catch (err: any) {
      return this.replyText(`Gagal set player: ${err?.message || err}`)
    }
  }

  @Cmd('(setstatus)', {
    as: ['setstatus'],
    description: 'Owner: set status (ikut clamp level ke bracket)',
    usePrefix: true,
    division: 'owner',
    acc: { owner: true },
    help: 'setstatus @user <statusKey> [level=..]',
  })
  async setStatus() {
    const jid = this.M.mention?.[0]
    const [rawJid, statusRaw, ...rest] = this.args || []
    const statusKey = statusRaw?.toLowerCase()
    if (!jid || !statusKey) return this.replyText('Format: ?setstatus @user <statusKey> [level=..]')

    const patch: { level?: number; statusKey?: string } = { statusKey }
    for (const token of rest) {
      const [k, v] = token.split('=')
      if (!k || v === undefined) continue
      if (k.toLowerCase() === 'level' && Number.isFinite(Number(v))) patch.level = Number(v)
    }

    return this.applyAdjust(jid, patch)
  }

  @Cmd('(setlevel)', {
    as: ['setlevel'],
    description: 'Owner: set level pemain (clamp ke status sekarang)',
    usePrefix: true,
    division: 'owner',
    acc: { owner: true },
    help: 'setlevel @user <level> [exp=..]',
  })
  async setLevel() {
    const jid = this.M.mention?.[0]
    const [rawJid, levelRaw, ...rest] = this.args || []
    const levelVal = Number(levelRaw)
    if (!jid || !Number.isFinite(levelVal)) return this.replyText('Format: ?setlevel @user <level> [exp=..]')

    const patch: { level?: number; exp?: number } = { level: levelVal }
    for (const token of rest) {
      const [k, v] = token.split('=')
      if (!k || v === undefined) continue
      if (k.toLowerCase() === 'exp' && Number.isFinite(Number(v))) patch.exp = Number(v)
    }

    return this.applyAdjust(jid, patch)
  }

  @Cmd('(setcoins|setcoin)', {
    as: ['setcoins'],
    description: 'Owner: set coins pemain',
    usePrefix: true,
    division: 'owner',
    acc: { owner: true },
    help: 'setcoins @user <amount>',
  })
  async setCoins() {
    const jid = this.M.mention?.[0]
    console.log(jid)
    const [rawJid, coinsRaw] = this.args || []
    const coinsVal = Number(coinsRaw)
    console.log(jid, this.args)
    if (!jid || !Number.isFinite(coinsVal)) return this.replyText('Format: ?setcoins @user <amount>')
    return this.applyAdjust(jid, { coins: coinsVal })
  }

  @Cmd('(setstreak)', {
    as: ['setstreak'],
    description: 'Owner: set streak pemain',
    usePrefix: true,
    division: 'owner',
    acc: { owner: true },
    help: 'setstreak @user <amount>',
  })
  async setStreak() {
    const jid = this.M.mention?.[0]
    const [rawJid, streakRaw] = this.args || []
    const streakVal = Number(streakRaw)
    if (!jid || !Number.isFinite(streakVal)) return this.replyText('Format: ?setstreak @user <amount>')
    return this.applyAdjust(jid, { streak: streakVal })
  }
}
