import dotenv from 'dotenv'
dotenv.config({ path: '.env' })
dotenv.config({ path: 'env' })
import * as Listener from './listeners'
import { BaseClient, Pair } from './handlers'
import type { AuthenticationCreds, ConnectionState, UserFacingSocketConfig, SignalKeyStore, MessageUpsertType, proto } from '@whiskeysockets/baileys'
import MainStart, { fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers} from '@whiskeysockets/baileys'
import { singleSessionPostgres } from './database'
import { createPostgresStore } from "./handlers"
import { functions } from './utils'
import { Logger } from './utils/logger'
import readline from 'readline'
import { promises as fs } from 'fs'
import QR from 'qrcode-terminal'
import path from 'path'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve))

export async function autoStart(configName: string = 'zan', usePair: boolean = false) {
  const POSTGRES_URL = process.env.POSTGRES_URL
  if (!POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not set. Please define it in .env or environment.')
  }

  const { state, saveState, deleteSession } = await singleSessionPostgres(configName, POSTGRES_URL)

  const config: UserFacingSocketConfig = {
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys as SignalKeyStore, functions.logger),
    },
    mobile: false,
    version: (await fetchLatestBaileysVersion()).version,
    logger: functions.logger,
    qrTimeout: 60000,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    emitOwnEvents: true,
    browser: Browsers.windows('Chrome')
  }

  const store = await createPostgresStore({ namespace: 'wa', connectionString: POSTGRES_URL })

  const client = new BaseClient()
  client.sock = MainStart(config)
  client.store = store as any

  if (usePair && !client.sock.authState.creds.registered) {
    const phoneNumber = await question('Enter your mobile phone number:\n')
    const code = await client.sock.requestPairingCode(phoneNumber)
    Logger.info(`Pairing code: ${code}`)
  }

  client.sock.ev.on('connection.update', async (arg: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = arg
    
    // Handle QR code display when not using pairing
    if (qr && !usePair) {
      QR.generate(qr, { small: true })
      Logger.info('📱 Scan QR code above to login')
    }
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== 401
      
      if (!shouldReconnect) {
        try {
          Logger.warn('Session unauthorized (401). Deleting auth from PostgreSQL and restarting...')
          await deleteSession()
          const authPath = path.join(process.cwd(), 'auth', configName)
          await fs.rm(authPath, { recursive: true, force: true })
          Logger.info('✅ Session deleted from PostgreSQL and filesystem. Restarting in 3s...')
          
          await new Promise(resolve => setTimeout(resolve, 3000))
          autoStart(configName, usePair)
        } catch (err) {
          Logger.error('Error deleting session: ' + err)
          autoStart(configName, usePair)
        }
      } else {
        try {
          Logger.warn('Connection error detected. retrying...')
          await new Promise(resolve => setTimeout(resolve, 3000))
          autoStart(configName, usePair)
        } catch (err) {
          Logger.error('Error deleting auth: ' + err)
          autoStart(configName, usePair)
        }
      }
    } else if (connection === 'open') {
      Logger.info('✅ Connection established')
      client.store.bind(client.sock.ev)
      client.store.load()
      try {
        await saveState()
        Logger.info('Auth state saved to PostgreSQL')
      } catch (e) {
        Logger.error('Failed to save auth state after open: ' + e)
      }
    } else if (connection === 'connecting') {
      Logger.info('🔄 Connecting...')
    }
  })

  const cmdDirectory = (await functions.parseCmd()).dir

  client.on('message.tag', Listener.Tag.bind(client))
  client.on('reaction', Listener.Reaction.bind(client))

  client.on('pair.cmd', (M) => {
    if (cmdDirectory.length >= 1)
      return void Pair.bind({ events: cmdDirectory })({ client: M.client, M: M.M })
  })

  client.once('end', () => {
    client.removeAllListeners
    client.setMaxListeners(0)
    return void client.sock.end(new Error())
  })

  client.sock.ev.on('messages.upsert', (arg: { messages: proto.IWebMessageInfo[]; type: MessageUpsertType }) => {
    new Listener.Message(client, arg)
  })

  client.sock.ev.on('creds.update', (creds: Partial<AuthenticationCreds>) => {
    try {
      Logger.debug('event: creds.update ' + Object.keys(creds || {}).join(','))
    } catch {}
    return saveState()
  })
}

autoStart()