import { Config, Cmd, BaseCommand, All } from '../../base'
import { Whatsapp } from 'violet'
import { getFableStore } from '../../database/postgres/fables'
import { getLevelingStore } from '../../database/postgres/leveling'

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }
  private checkedUsers = new Map<string, number>()
  private CHECK_INTERVAL = 10_000

  @Cmd('(fable)', {
    as: ['fable'],
    description: 'Lihat fable progress dan claim rewards',
    usePrefix: true,
    division: 'rpg',
    acc: { owner: false },
    help: 'fable [claim <id>]',
  })
  async fable() {
    try {
      const fableStore = await getFableStore()
      const levelingStore = await getLevelingStore()

      const jid = this.M.sender as string
      const subCmd = this.args?.[0]?.toLowerCase()
      const fableId = Number(this.args?.[1])

      if (subCmd === 'claim' && Number.isFinite(fableId)) {
        const fable = await fableStore.claimFable(jid, fableId)
        if (!fable) {
          return this.replyText('Fable tidak ditemukan atau sudah diklaim.')
        }

        const player = await levelingStore.getPlayer(jid)
        if (player) {
          const newCoins = Number(player.coins) + fable.reward_coins
          const newGems = Number(player.gems || 0) + fable.reward_gems
          await levelingStore.adminAdjust(jid, {
            coins: newCoins,
            gems: newGems,
          })
        }

        let message = `🔮 FABLE CLAIMED!\n\n`
        message += `${fable.name}\n\n`
        message += `Reward:\n`
        if (fable.reward_coins > 0) message += `💰 ${fable.reward_coins} coins\n`
        if (fable.reward_gems > 0) message += `💎 ${fable.reward_gems} gems\n`
        message += `\n✨ Buff: +${fable.buff_value}% ${fable.buff_type}`

        return this.replyText(message)
      }

      const allFables = await fableStore.getAllFables()
      const playerFables = await fableStore.getPlayerFables(jid)
      const claimedIds = new Set(playerFables.filter(pf => pf.claimed_at).map(pf => pf.fable_id))
      const triggeredIds = new Set(playerFables.filter(pf => pf.triggered_at && !pf.claimed_at).map(pf => pf.fable_id))

      let message = `📖 FABLE PROGRESS\n\n`

      for (const fable of allFables) {
        let icon = '⬜'
        if (claimedIds.has(fable.id)) icon = '✅'
        else if (triggeredIds.has(fable.id)) icon = '🔮'

        message += `${icon} ${fable.name}\n`
        if (triggeredIds.has(fable.id)) {
          message += `   Menunggu claim! [?fable claim ${fable.id}]\n`
        }
      }

      message += `\n📊 Buff Aktif:\n`
      const buffs = await fableStore.getActiveFableBuffs(jid)
      if (Object.keys(buffs).length === 0) {
        message += `Belum ada buff aktif`
      } else {
        for (const [buffType, buffValue] of Object.entries(buffs)) {
          message += `+${buffValue}% ${buffType}\n`
        }
      }

      return this.replyText(message)
    } catch (err: any) {
      return this.replyText(`Error: ${err?.message || err}`)
    }
  }

  @All()
  async all() {
    const M = this.M
    if (!M?.sender) return

    const sender = M.sender
    const now = Date.now()
    const lastCheck = this.checkedUsers.get(sender) || 0
    if (now - lastCheck < this.CHECK_INTERVAL) return
    this.checkedUsers.set(sender, now)

    try {
      const fableStore = await getFableStore()
      const levelingStore = await getLevelingStore()

      const player = await levelingStore.getPlayer(sender)
      if (!player?.is_registered) return

      const playerFables = await fableStore.getPlayerFables(sender)
      const pendingFables = playerFables.filter((pf) => pf.triggered_at && !pf.claimed_at)

      if (pendingFables.length === 0) return

      const allFables = await fableStore.getAllFables()

      for (const pf of pendingFables) {
        const fable = allFables.find((f) => f.id === pf.fable_id)
        if (!fable) continue
        const notifMsg = `🔮 Kamu telah menemukan sebuah Fable!\n\n*${fable.name}*\n\n"${fable.lore}"\n\nKetik *?fable claim ${fable.id}* untuk mengklaim reward!`

        await this.client.sendText(sender, notifMsg, { quoted: this.M }).catch(() => {})
      }
    } catch (error) {
    }
  }

  @Cmd('(givefable)', {
    as: ['givefable'],
    description: 'Owner: berikan fable ke user',
    usePrefix: true,
    division: 'owner',
    acc: { owner: true },
    help: 'givefable <jid> <fable_id>',
  })
  async giveFable() {
    try {
      const fableStore = await getFableStore()

      const targetJid = this.M.mention?.[0]
      const fableIdToGive = Number(this.args?.[1])

      if (!targetJid || !Number.isFinite(fableIdToGive)) {
        return this.replyText('Format: ?givefable <jid> <fable_id>')
      }

      const allFables = await fableStore.getAllFables()
      const fable = allFables.find(f => f.id === fableIdToGive)
      if (!fable) {
        return this.replyText('Fable ID tidak ditemukan.')
      }

      const success = await fableStore.giveFableToUser(targetJid, fableIdToGive)
      if (success) {
        return this.client.sendText(this.M.from, `✅ Fable "${fable.name}" diberikan ke @${targetJid.split('@')[0]}`, { mentions: [targetJid], quoted: this.M })
      } else {
        return this.replyText(`❌ Gagal memberikan fable.`)
      }
    } catch (err: any) {
      return this.replyText(`Error: ${err?.message || err}`)
    }
  }
}
