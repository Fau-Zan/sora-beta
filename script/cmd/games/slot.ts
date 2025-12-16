import { Config, Cmd, BaseCommand } from '../../base'
import { Whatsapp } from 'violet'
import { getLevelingStore } from '../../database/postgres/leveling'
import { jidNormalizedUser } from '@whiskeysockets/baileys'

type SlotSymbol = '🍎' | '🍊' | '🍋' | '🍌' | '💎' | '🔔'

const SYMBOLS: SlotSymbol[] = ['🍎', '🍊', '🍋', '🍌', '💎', '🔔']
const SLOT_COOLDOWN = new Map<string, number>()
const COOLDOWN_MS = 2000

function getRandomSymbol(): SlotSymbol {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
}

function calculateMultiplier(symbols: SlotSymbol[]): number {
  const [s1, s2, s3] = symbols

  if (s1 === s2 && s2 === s3) {
    if (s1 === '💎') return 50 
    return 10 
  }

  if (s1 === s2 || s2 === s3 || s1 === s3) {
    return 3
  }

  return 0
}

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }

  @Cmd('(slot)', {
    as: ['slot'],
    description: 'Main slot machine dengan bet coin',
    usePrefix: true,
    division: 'game',
    acc: { owner: false },
    help: 'slot <bet>\nBet minimal 10 coins, maksimal 500 coins',
  })
  async slot() {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return this.replyText('Leveling belum aktif.')

    const sender = jidNormalizedUser(this.M.sender as string)
    const now = Date.now()
    const lastSpin = SLOT_COOLDOWN.get(sender)

    if (lastSpin && now - lastSpin < COOLDOWN_MS) {
      return this.replyText(`⏳ Tunggu ${Math.ceil((COOLDOWN_MS - (now - lastSpin)) / 1000)}s sebelum spin lagi.`)
    }

    const betRaw = this.args?.[0]
    const bet = Number(betRaw)

    if (!Number.isFinite(bet) || bet < 10 || bet > 500) {
      return this.replyText('Format: ?slot <bet>\nBet minimal 10, maksimal 500 coins.')
    }

    try {
      const store = await getLevelingStore()
      const player = await store.getPlayer(sender)

      if (!player?.is_registered) {
        return this.replyText('Kamu harus register dulu. Ketik ?register <nama> <male/female>')
      }

      const playerCoins = Number(player.coins)
      if (!Number.isFinite(playerCoins)) {
        return this.replyText('Data koin tidak valid. Hubungi admin.')
      }

      if (playerCoins < bet) {
        return this.replyText(`Koin kamu kurang. Butuh ${bet}, punya ${player.coins}.`)
      }

      SLOT_COOLDOWN.set(sender, now)

      const symbols: SlotSymbol[] = [
        getRandomSymbol(),
        getRandomSymbol(),
        getRandomSymbol(),
      ]

      const multiplier = calculateMultiplier(symbols)
      const winAmount = Math.floor(bet * multiplier)

      let message = `🎰 SLOT MACHINE\n\n`
      message += `${symbols.join('  ')}\n\n`
      message += `Bet: ${bet} coins\n`

      if (multiplier === 0) {
        const newCoins = Math.max(0, playerCoins - bet)
        await store.adminAdjust(sender, { coins: newCoins })
        await store.addExp(sender, 15, 1, 0)
        message += `KALAH!\n`
        message += `Hilang ${bet} coins\n`
        message += `Sisa: ${newCoins} coins`
      } else {
        const totalWin = bet + winAmount
        const newCoins = playerCoins + winAmount
        await store.adminAdjust(sender, { coins: newCoins })
        let expReward = 25
        if (multiplier >= 50) expReward = 80
        else if (multiplier >= 10) expReward = 40
        await store.addExp(sender, expReward, 1, 0)

        if (multiplier >= 50) {
          const gemChance = Math.random()
          if (gemChance < 0.1) {
            const { applyFableBuffs } = await import('../../utils/leveling')
            const { gems: buffedGems } = await applyFableBuffs(sender, 0, 0, 1)
            
            await store.adminAdjust(sender, { gems: Number((await store.getPlayer(sender))!.gems) + buffedGems })
            message += `🤑 JACKPOT!!!!
💎 +${buffedGems} GEMS!
`
          } else {
            message += `🤑 JACKPOT!!!!
`
          }
        } else if (multiplier >= 10) {
          message += `🎉 BIG WIN!\n`
        } else {
          message += `✅ MENANG!\n`
        }

        message += `Dapat ${totalWin} coins (x${multiplier})\n`
        message += `Sisa: ${newCoins} coins`
      }

      return this.replyText(message)
    } catch (err: any) {
      return this.replyText(`Error: ${err?.message || err}`)
    }
  }

  @Cmd('(slothelp|slotinfo)', {
    as: ['slothelp'],
    description: 'Informasi cara main slot',
    usePrefix: true,
    division: 'game',
    acc: { owner: false },
  })
  async slothelp() {
    const info = `🎰 SLOT MACHINE INFO\n\n`
      + `📌 Cara Main:\n`
      + `?slot <bet>\n\n`
      + `💰 Sistem Hadiah:\n`
      + `🍎🍎🍎 = 10x (Triple)\n`
      + `🍊🍊🍊 = 10x (Triple)\n`
      + `💎💎💎 = 50x (Jackpot!)\n`
      + `Dua simbol sama = 3x\n`
      + `Tidak ada yang sama = Kalah\n\n`
      + `⚙️ Rules:\n`
      + `• Min bet: 10 coins\n`
      + `• Max bet: 500 coins\n`
      + `• Cooldown: 2 detik\n`
      + `• Hanya 1 spin sekaligus`

    return this.replyText(info)
  }
}
