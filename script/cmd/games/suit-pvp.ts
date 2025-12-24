import { Config, Cmd, BaseCommand } from '../../base'
import { All } from '../../base'
import { Whatsapp } from 'violet'
import { getLevelingStore } from '../../database/postgres/leveling'
import { jidNormalizedUser } from '@whiskeysockets/baileys'

type SuitChoice = 'rock' | 'paper' | 'scissors'
type SuitSession = {
  challenger: string
  opponent: string
  bet: number
  groupJid: string
  challengerChoice?: SuitChoice
  opponentChoice?: SuitChoice
  createdAt: number
}

const SUIT_SESSIONS = new Map<string, SuitSession>()
const EMOJI_MAP: Record<SuitChoice, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
}

function determineWinner(p1: SuitChoice, p2: SuitChoice): 'p1' | 'p2' | 'draw' {
  if (p1 === p2) return 'draw'
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'scissors' && p2 === 'paper') ||
    (p1 === 'paper' && p2 === 'rock')
  ) {
    return 'p1'
  }
  return 'p2'
}

@Config()
export class command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }

  @Cmd('(suit)', {
    as: ['suit'],
    description: 'Challenge player lain suit (rock/paper/scissors)',
    usePrefix: true,
    division: 'game',
    acc: { owner: false },
    help: 'suit @user <bet>',
  })
  async suit() {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return this.replyText('Leveling belum aktif.')

    const opponentRaw = (this.M).mention?.[0]
    const opponent = opponentRaw ? jidNormalizedUser(opponentRaw) : null
    const betRaw = this.args?.[1]
    const bet = Number(betRaw)

    if (!opponent || !Number.isFinite(bet) || bet < 10) {
      return this.replyText('Format: ?suit @user <bet>\nBet minimal 10 coins.')
    }

    const challenger = jidNormalizedUser(this.M.sender as string)
    if (opponent === challenger) return this.replyText('Tidak bisa challenge diri sendiri.')

    try {
      const store = await getLevelingStore()
      const challengerData = await store.getPlayer(challenger)
      const target = await store.getPlayer(opponent)

      if (!challengerData?.is_registered || !target?.is_registered) {
        return this.replyText('Kedua player harus sudah register.')
      }

      if (challengerData.coins < bet) {
        return this.replyText(`Koin kamu kurang. Butuh ${bet}, punya ${challengerData.coins}.`)
      }

      if (target.coins < bet) {
        return this.replyText(`Koin @${opponent.split('@')[0]} kurang untuk match bet ini.`)
      }

      const sessionKey = `${challenger}-${opponent}`
      if (SUIT_SESSIONS.has(sessionKey)) {
        return this.replyText('Kamu sudah punya challenge pending dengan player ini.')
      }

      SUIT_SESSIONS.set(sessionKey, {
        challenger,
        opponent,
        bet,
        groupJid: this.M.from,
        createdAt: Date.now(),
      })

      return this.client.sendMessage<'conversation'>(
        this.M.from,
        `@${opponent.split('@')[0]} kamu ditantang suit oleh @${challenger.split('@')[0]}!\n\nBet: ${bet} coins\n\nKetik ?accept untuk terima atau ?reject untuk tolak (1 menit).`,
        'conversation',
        { quoted: this.M, mentions: [challenger, opponent] }
      )
    } catch (err: any) {
      return this.replyText(`Error: ${err?.message || err}`)
    }
  }

  @Cmd('(accept|terima)', {
    as: ['accept'],
    description: 'Terima suit challenge',
    usePrefix: true,
    division: 'game',
    acc: { owner: false },
  })
  async accept() {
    const sender = jidNormalizedUser(this.M.sender as string)
    let session: SuitSession | undefined
    let sessionKey = ''

    for (const [key, val] of SUIT_SESSIONS.entries()) {
      if (val.opponent === sender) {
        session = val
        sessionKey = key
        break
      }
    }

    if (!session) return this.replyText('Tidak ada challenge pending untuk kamu.')

    await this.client.sendMessage<'conversation'>(
      this.M.from,
      `Challenge diterima!\n\n@${session.challenger.split('@')[0]} dan @${sender.split('@')[0]} akan menerima DM untuk memilih. Cek chat pribadi!`,
      'conversation',
      { mentions: [session.challenger, sender] }
    )

    await this.client.sendText(
      session.challenger,
      `Suit Match dimulai!\nBet: ${session.bet} coins\n\nPilih dengan mengetik:\nrock / paper / scissors\n(tanpa prefix, langsung ketik di sini)`
    )

    await this.client.sendText(
      sender,
      `Suit Match dimulai!\nBet: ${session.bet} coins\n\nPilih dengan mengetik:\nrock / paper / scissors\n(tanpa prefix, langsung ketik di sini)`
    )
  }

  @Cmd('(reject|tolak)', {
    as: ['reject'],
    description: 'Tolak suit challenge',
    usePrefix: true,
    division: 'game',
    acc: { owner: false },
  })
  async reject() {
    const sender = jidNormalizedUser(this.M.sender as string)
    let sessionKey = ''

    for (const [key, val] of SUIT_SESSIONS.entries()) {
      if (val.opponent === sender) {
        sessionKey = key
        break
      }
    }

    if (!sessionKey) return this.replyText('Tidak ada challenge pending untuk kamu.')

    const session = SUIT_SESSIONS.get(sessionKey)!
    SUIT_SESSIONS.delete(sessionKey)

    return this.client.sendMessage<'conversation'>(
      this.M.from,
      `@${sender.split('@')[0]} menolak challenge dari @${session.challenger.split('@')[0]}.`,
      'conversation',
      { quoted: this.M, mentions: [sender, session.challenger] }
    )
  }

  @Cmd('(suitcancel|cancelsess)', {
    as: ['suitcancel'],
    description: 'Cancel semua suit session (debug)',
    usePrefix: true,
    division: 'owner',
    acc: { owner: true },
  })
  async cancelAll() {
    const count = SUIT_SESSIONS.size
    SUIT_SESSIONS.clear()
    return this.replyText(`Cleared ${count} suit sessions.`)
  }

  @All()
  async handleSuitChoice() {
    if (!this.M?.body || this.M.isGroup) return
    const sender = jidNormalizedUser(this.M.sender as string)
    const body = this.M.body.toLowerCase().trim()
    const validChoices = ['rock', 'paper', 'scissors', 'batu', 'kertas', 'gunting']
    if (!validChoices.includes(body)) return
    const choice: SuitChoice =
      body === 'batu' ? 'rock' : body === 'kertas' ? 'paper' : body === 'gunting' ? 'scissors' : (body as SuitChoice)

    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) return

    let session: SuitSession | undefined
    let sessionKey = ''

    for (const [key, val] of SUIT_SESSIONS.entries()) {
      if (val.challenger === sender || val.opponent === sender) {
        session = val
        sessionKey = key
        break
      }
    }

    if (!session) return
    if (sender === session.challenger) {
      if (session.challengerChoice) return this.replyText('Kamu sudah memilih.')
      session.challengerChoice = choice
      SUIT_SESSIONS.set(sessionKey, session)
      await this.replyText(`Pilihan tersimpan ${EMOJI_MAP[choice]}. Menunggu lawan...`)
    } else if (sender === session.opponent) {
      if (session.opponentChoice) return this.replyText('Kamu sudah memilih.')
      session.opponentChoice = choice
      SUIT_SESSIONS.set(sessionKey, session)
      await this.replyText(`Pilihan tersimpan ${EMOJI_MAP[choice]}. Menunggu lawan...`)
    }

    if (session.challengerChoice && session.opponentChoice) {
      SUIT_SESSIONS.delete(sessionKey)

      const result = determineWinner(session.challengerChoice, session.opponentChoice)
      const store = await getLevelingStore()

      let winnerJid = ''
      let loserJid = ''
      let message = ''

      if (result === 'draw') {
        message = `🤝 SERI!\n\n@${session.challenger.split('@')[0]}: ${EMOJI_MAP[session.challengerChoice]}\n@${session.opponent.split('@')[0]}: ${EMOJI_MAP[session.opponentChoice]}\n\nTidak ada yang menang/kalah.`
      } else if (result === 'p1') {
        winnerJid = session.challenger
        loserJid = session.opponent
        const winnerData = await store.getPlayer(winnerJid)
        const loserData = await store.getPlayer(loserJid)
        
        const { applyFableBuffs } = await import('../../utils/leveling')
        const { coins: buffedCoins } = await applyFableBuffs(winnerJid, 0, session.bet)
        
        await store.adminAdjust(winnerJid, { coins: Number(winnerData!.coins) + buffedCoins })
        await store.adminAdjust(loserJid, { coins: Math.max(0, Number(loserData!.coins) - session.bet) })
        await store.addExp(winnerJid, 50, 1, 0)
        await store.addExp(loserJid, 20, 1, 0)
        message = `🎉 @${winnerJid.split('@')[0]} MENANG!\n\n@${session.challenger.split('@')[0]}: ${EMOJI_MAP[session.challengerChoice]}\n@${session.opponent.split('@')[0]}: ${EMOJI_MAP[session.opponentChoice]}\n\nPot: ${session.bet * 2} coins → Winner`
      } else {
        winnerJid = session.opponent
        loserJid = session.challenger
        const winnerData = await store.getPlayer(winnerJid)
        const loserData = await store.getPlayer(loserJid)
        
        const { applyFableBuffs } = await import('../../utils/leveling')
        const { coins: buffedCoins } = await applyFableBuffs(winnerJid, 0, session.bet)
        
        await store.adminAdjust(winnerJid, { coins: Number(winnerData!.coins) + buffedCoins })
        await store.adminAdjust(loserJid, { coins: Math.max(0, Number(loserData!.coins) - session.bet) })
        await store.addExp(winnerJid, 50, 1, 0)
        await store.addExp(loserJid, 20, 1, 0)
        message = `🎉 @${winnerJid.split('@')[0]} MENANG!\n\n@${session.challenger.split('@')[0]}: ${EMOJI_MAP[session.challengerChoice]}\n@${session.opponent.split('@')[0]}: ${EMOJI_MAP[session.opponentChoice]}\n\nPot: ${session.bet * 2} coins → Winner`
      }

      await this.client.sendText(session.challenger, result === 'draw' ? 'Hasil: SERI!' : sender === winnerJid ? 'Kamu MENANG! 🎉' : 'Kamu KALAH 😢')
      await this.client.sendText(session.opponent, result === 'draw' ? 'Hasil: SERI!' : sender === winnerJid ? 'Kamu MENANG! 🎉' : 'Kamu KALAH 😢')

      if (result !== 'draw') {
        const winnerData = await store.getPlayer(winnerJid)
        const newWins = Number(winnerData!.suit_wins || 0) + 1
        await store.adminAdjust(winnerJid, { suit_wins: newWins })
      }

      await this.client.sendMessage<'conversation'>(session.groupJid, message, 'conversation', {
        mentions: [session.challenger, session.opponent],
      })
    }
  }
}
