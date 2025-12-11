import dotenv from 'dotenv'
dotenv.config({ path: 'env' })
import * as Listener from './listeners'
import { BaseClient, Pair } from './handlers'
import type { AuthenticationCreds, ConnectionState, UserFacingSocketConfig, MessageUpsertType, proto } from '@whiskeysockets/baileys'
import MainStart, { fetchLatestBaileysVersion, makeCacheableSignalKeyStore, SignalKeyStore } from '@whiskeysockets/baileys'
import { singleSessionPostgres } from './database'
import { createPostgresStore } from "./handlers"
import { functions } from './utils'
import NodeCache from 'node-cache'
import readline from 'readline'
import { promises as fs } from 'fs'
import path from 'path'

const msgRetryCounterCache = new NodeCache()
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve))

export async function autoStart(configName: string = 'zan', usePair: boolean = false) {
  const POSTGRES_URL = process.env.POSTGRES_URL!

  const { state, saveState, deleteSession } = await singleSessionPostgres(configName, POSTGRES_URL)

  const config: UserFacingSocketConfig = {
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys as SignalKeyStore, functions.logger),
    },
    printQRInTerminal: !usePair,
    mobile: false,
    version: (await fetchLatestBaileysVersion()).version,
    logger: functions.logger,
    qrTimeout: 60000,
    msgRetryCounterCache,
    generateHighQualityLinkPreview: true,
  }

  const store = await createPostgresStore({ namespace: 'wa', connectionString: POSTGRES_URL })

  const client = new BaseClient()
  client.sock = (MainStart as any).default(config)
  client.store = store as any

  if (usePair && !client.sock.authState.creds.registered) {
    const phoneNumber = await question('Enter your mobile phone number:\n')
    const code = await client.sock.requestPairingCode(phoneNumber)
    console.log(`Pairing code: ${code}`)
  }

  client.sock.ev.on('connection.update', async (arg: Partial<ConnectionState>) => {
    const { connection, lastDisconnect } = arg
    
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== 401
      
      if (!shouldReconnect) {
        try {
          console.log('Session unauthorized (401). Deleting auth from PostgreSQL and restarting...')
          await deleteSession()
          const authPath = path.join(process.cwd(), 'auth', configName)
          await fs.rm(authPath, { recursive: true, force: true })
          console.log('✅ Session deleted from PostgreSQL and filesystem. Restarting in 3s...')
          
          await new Promise(resolve => setTimeout(resolve, 3000))
          autoStart(configName, usePair)
        } catch (err) {
          console.error('Error deleting session:', err)
          autoStart(configName, usePair)
        }
      } else {
        try {
          console.log('Connection error detected. retrying...')
          await new Promise(resolve => setTimeout(resolve, 3000))
          autoStart(configName, usePair)
        } catch (err) {
          console.error('Error deleting auth:', err)
          autoStart(configName, usePair)
        }
      }
    } else if (connection === 'open') {
      console.log('✅ Connection established')
      client.store.bind(client.sock.ev)
      await client.store.load()
    } else if (connection === 'connecting') {
      console.log('🔄 Connecting...')
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
    if (creds) creds
    return saveState()
  })
}

autoStart()