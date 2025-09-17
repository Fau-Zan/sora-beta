import dotenv from 'dotenv'
dotenv.config({ path: 'env' })
import * as Listener from './listeners'
import { BaseClient, Pair } from './handlers'
import type { AuthenticationCreds, ConnectionState, UserFacingSocketConfig, MessageUpsertType, proto } from '@whiskeysockets/baileys'
import MainStart, { fetchLatestBaileysVersion, makeCacheableSignalKeyStore, SignalKeyStore } from '@whiskeysockets/baileys'
import { singleSessionMongo } from './database'
import { createMongoStore } from "./handlers"
import { functions } from './utils'
import NodeCache from 'node-cache'
import readline from 'readline'

const msgRetryCounterCache = new NodeCache()
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text: string) => new Promise<string>((resolve) => rl.question(text, resolve))

export async function autoStart(configName: string = 'zan', usePair: boolean = false) {
  const MONGO_URI = process.env.MONGO_URI!
  const MONGO_DB = process.env.MONGO_DB || 'violet'

  const { state, saveState } = await singleSessionMongo(configName, MONGO_URI, MONGO_DB)

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

  const store = await createMongoStore({ namespace: 'wa', uri: MONGO_URI, dbName: MONGO_DB })

  const client = new BaseClient()
  client.sock = (MainStart as any).default(config)
  client.store = store as any

  if (usePair && !client.sock.authState.creds.registered) {
    const phoneNumber = await question('Enter your mobile phone number:\n')
    const code = await client.sock.requestPairingCode(phoneNumber)
    console.log(`Pairing code: ${code}`)
  }

  client.sock.ev.on('connection.update', async (arg: Partial<ConnectionState>) => {
    const { connection } = arg
    switch (connection) {
      case 'close':
        autoStart()
        break
      case 'open':
        client.store.bind(client.sock.ev)
        await client.store.load()
        break
      case 'connecting':
        console.log('connecting...')
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
      .then(() => console.log('Violet started!'))
      .catch((err) => console.error('Violet failed:', err))