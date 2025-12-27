import { Config, Cmd, BaseCommand } from '../../base'
import { Whatsapp } from 'violet'
import { Logger } from '../../utils/logger'
import { autoStart, activeSessions } from '../../index'
import { PostgresBase } from '../../database/postgres'
import QRCode from 'qrcode'

@Config()
export class Command extends BaseCommand {
  constructor(public client: Whatsapp.IClient, M: Whatsapp.IWaMess) {
    super(client, M)
  }

  @Cmd('(session|bot|newsession)', {
    as: ['session'],
    division: 'owner',
    usePrefix: true,
    help: 'session <name> [--pair] - start bot session & kirim QR ke chat',
    acc: { owner: true },
  })
  async createSession() {
    if (activeSessions.size > 0) {
      const activeSessNames = Array.from(activeSessions).join(', ')
      return await this.replyText(
        `Tidak bisa membuat session baru!\n\nMasih ada session yang sedang dalam proses scan/pair: ${activeSessNames}\n\nTunggu hingga proses selesai atau batalkan session tersebut.`
      )
    }

    const rawSessionName = this.args?.[0] || `session_${Date.now()}`
    const sessionName = rawSessionName.replace(/[^a-zA-Z0-9_]/g, '_')
    const usePair = !!(this.modify?.verify?.pair || this.modify?.verify?.p)

    await this.replyText(
      `Session "${sessionName}" dimulai. QR akan dikirim ke chat ini${usePair ? ' (pairing code mode)' : ''}.`
    )

    const qrHandler = async (qr: string) => {
      try {
        const png = await QRCode.toBuffer(qr, { type: 'png' })
        await this.client.sock.sendMessage(this.M.from, {
          image: png,
          caption: `Scan QR untuk session "${sessionName}" (berlaku 60s)`,
        })
        Logger.info(`QR sent to chat for session ${sessionName}`)
      } catch (err) {
        Logger.error(`Failed to send QR to chat: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    autoStart(sessionName, usePair, qrHandler).catch((err) => {
      Logger.error(`Failed to start session ${sessionName}: ${err instanceof Error ? err.message : String(err)}`)
      activeSessions.delete(sessionName)
      this.replyText(`Gagal memulai session ${sessionName}: ${err instanceof Error ? err.message : String(err)}`)
    })
  }

  @Cmd('(listsession|sessions|listsesi)', {
    as: ['listsession'],
    division: 'owner',
    usePrefix: true,
    help: 'listsession - tampilkan daftar semua session',
    acc: { owner: true },
  })
  async listSessions() {
    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) {
      return await this.replyText('POSTGRES_URL tidak ditemukan di environment.')
    }

    try {
      const db = await new PostgresBase({ connectionString: POSTGRES_URL }).connect()
      const sessions = await db.query('SELECT session_id, created_at, updated_at FROM wa_auth ORDER BY updated_at DESC')

      if (!sessions.rows || sessions.rows.length === 0) {
        return await this.replyText('Tidak ada session tersimpan di database.')
      }
      let message = `📋 *Daftar Session* (${sessions.rows.length})\n\n`
      for (const session of sessions.rows) {
        const isActive = activeSessions.has(session.session_id)
        const status = isActive ? 'Scanning/Pairing' : 'Tersimpan'
        const updatedAt = new Date(session.updated_at).toLocaleString('id-ID')
        message += `${status} *${session.session_id}*\n`
        message += `   📅 Update: ${updatedAt}\n\n`
      }
      await this.replyText(message.trim())
      await db.close()
    } catch (err) {
      Logger.error(`Failed to list sessions: ${err instanceof Error ? err.message : String(err)}`)
      await this.replyText(`Gagal mengambil daftar session: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  @Cmd('(delsession|deletesession|hapussession)', {
    as: ['delsession'],
    division: 'owner',
    usePrefix: true,
    help: 'delsession <name> - hapus session dari database',
    acc: { owner: true },
  })
  async deleteSession() {
    const sessionName = this.args?.[0]

    if (!sessionName) {
      return await this.replyText('Berikan nama session yang akan dihapus!\n\nContoh: .delsession zan')
    }

    const POSTGRES_URL = process.env.POSTGRES_URL
    if (!POSTGRES_URL) {
      return await this.replyText('POSTGRES_URL tidak ditemukan di environment.')
    }

    try {
      const db = await new PostgresBase({ connectionString: POSTGRES_URL }).connect()
      const exists = await db.findOne('wa_auth', { session_id: sessionName })
      if (!exists) {
        await db.close()
        return await this.replyText(`Session "${sessionName}" tidak ditemukan di database.`)
      }

      activeSessions.delete(sessionName)
      await db.deleteMany('wa_auth', { session_id: sessionName })
      const tablesToDelete = ['chats', 'contacts', 'messages']
      for (const table of tablesToDelete) {
        const tableName = `${sessionName}_${table}`
        try {
          await db.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`)
          Logger.info(`Dropped table: ${tableName}`)
        } catch (err) {
          Logger.warn(`Failed to drop table ${tableName}: ${err}`)
        }
      }

      await this.replyText(`Session "${sessionName}" berhasil dihapus dari database beserta semua data terkait.`)
      await db.close()

      Logger.info(`Session ${sessionName} deleted by user`)
    } catch (err) {
      Logger.error(`Failed to delete session: ${err instanceof Error ? err.message : String(err)}`)
      await this.replyText(`Gagal menghapus session: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
