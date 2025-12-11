import * as baileys from '@whiskeysockets/baileys'
import type { AuthenticationCreds, SignalDataTypeMap } from '@whiskeysockets/baileys'
import { PostgresBase } from './postgres'
import { Logger } from '../../utils'

const { proto, BufferJSON, initAuthCreds } = baileys

type AuthDoc = { session_id: string; auth: string }

const KEY_MAP: { [K in keyof SignalDataTypeMap]: string } = {
  'pre-key': 'preKeys',
  session: 'sessions',
  'sender-key': 'senderKeys',
  'app-state-sync-key': 'appStateSyncKeys',
  'app-state-sync-version': 'appStateVersions',
  'sender-key-memory': 'senderKeyMemory',
  'lid-mapping': 'lidMapping',
  'device-list': 'deviceList',
  tctoken: 'tctoken',
}

export async function singleSessionPostgres(sessionId: string, connectionString: string) {
  const db = await new PostgresBase({ connectionString, serializeWrites: true }).connect()
  await db.ensureTable(
    'wa_auth',
    `
      session_id VARCHAR(255) PRIMARY KEY,
      auth TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `
  )

  await db.ensureIndexes('wa_auth', [{ columns: ['session_id'], unique: true }])

  let creds: AuthenticationCreds
  let keys: Record<string, any>

  const loaded = await db.findOne<AuthDoc>('wa_auth', { session_id: sessionId }).catch(() => null as any)
  if (loaded?.auth) {
    try {
      const parsed = JSON.parse(loaded.auth, BufferJSON.reviver)
      creds = parsed?.creds ?? initAuthCreds()
      keys = parsed?.keys ?? {}
    } catch {
      creds = initAuthCreds()
      keys = {}
    }
  } else {
    creds = initAuthCreds()
    keys = {}
  }

  keys.preKeys = keys.preKeys || {}
  keys.sessions = keys.sessions || {}
  keys.senderKeys = keys.senderKeys || {}
  keys.appStateSyncKeys = keys.appStateSyncKeys || {}
  keys.appStateVersions = keys.appStateVersions || {}
  keys.senderKeyMemory = keys.senderKeyMemory || {}
  keys.lidMapping = keys.lidMapping || {}
  keys.deviceList = keys.deviceList || {}
  keys.tctoken = keys.tctoken || {}

  const persist = async (payload: { creds: AuthenticationCreds; keys: any }) => {
    await db.deleteMany('wa_auth', { session_id: sessionId })
    await db.upsertOne<AuthDoc>(
      'wa_auth',
      'session_id',
      {
        session_id: sessionId,
        auth: JSON.stringify(payload, BufferJSON.replacer, 2),
      } as any
    )
  }

  const saveState = async () => {
    try {
      let input = { creds, keys }
      await persist(input)
    } catch (e) {
      Logger.error('singleSessionPostgres: persist failed', e)
    }
  }

  return {
    state: {
      get creds() {
        return creds
      },
      keys: {
        get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
          const key = KEY_MAP[type]
          return ids.reduce((dict: any, id: string) => {
            let value = keys[key]?.[id]
            if (value) {
              if (type === 'app-state-sync-key') {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              dict[id] = value
            }
            return dict
          }, {})
        },
        set: async (data: Partial<Record<keyof SignalDataTypeMap, any>>) => {
          for (const raw in data) {
            const k = raw as keyof SignalDataTypeMap
            const mapped = KEY_MAP[k]
            keys[mapped] = keys[mapped] || {}
            Object.assign(keys[mapped], data[k])
          }
          await saveState()
        },
      },
    },
    saveState: async () => {
      return saveState()
    },
    deleteSession: async () => {
      try {
        await db.deleteMany('wa_auth', { session_id: sessionId })
        Logger.info(`Session ${sessionId} deleted from PostgreSQL`)
      } catch (e) {
        Logger.error('Failed to delete session from PostgreSQL:', e)
      }
    },
    close: async () => {
      await db.close()
    },
  }
}
